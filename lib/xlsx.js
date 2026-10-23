import zlib from "node:zlib";

/**
 * Minimal .xlsx reader: returns the first sheet as an array of rows (arrays of strings).
 * Handles shared strings, inline strings, numbers and booleans. No formulas are evaluated;
 * the cached value Excel saved is used.
 */

const MAX_UNZIPPED = 200 * 1024 * 1024;

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("Not a zip file");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Bad zip directory");
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    files.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }

  return (name) => {
    const f = files.get(name);
    if (!f) return null;
    const start = f.local + 30 + buf.readUInt16LE(f.local + 26) + buf.readUInt16LE(f.local + 28);
    const data = buf.subarray(start, start + f.size);
    if (f.method === 0) return data.toString("utf8");
    if (f.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED }).toString("utf8");
    throw new Error("Unsupported zip compression");
  };
}

const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[k];
  });

const textOf = (xml) =>
  decode([...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

function colIndex(ref) {
  const letters = (ref || "").match(/^[A-Z]+/)?.[0];
  if (!letters) return -1;
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function numberText(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Number.isInteger(n) && Math.abs(n) >= 1e15) return BigInt(Math.round(n)).toString();
  return String(n);
}

export function isXlsx(buf) {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b; // "PK" zip header
}

export function readXlsx(buf) {
  const read = unzip(buf);

  // Find the first sheet's file through the workbook and its relationships.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const wb = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  const firstSheet = wb?.match(/<sheet\b[^>]*>/)?.[0];
  const rid = firstSheet && (attr(firstSheet, "r:id") || attr(firstSheet, "id"));
  if (rid && rels) {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => attr(r, "Id") === rid);
    const target = rel && attr(rel, "Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }

  const sheet = read(sheetPath);
  if (!sheet) throw new Error("No sheet found");

  const ssXml = read("xl/sharedStrings.xml") || "";
  const shared = [...ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  const rows = [];
  for (const rm of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row = [];
    let next = 0;
    for (const cm of (rm[1] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = cm[1];
      const inner = cm[2] || "";
      const idx = colIndex(attr(tag, "r"));
      const at = idx === -1 ? next : idx;
      next = at + 1;
      const type = attr(tag, "t");
      const v = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = textOf(inner);
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (type === "e") value = "";
      else if (type === "str") value = decode(v || "");
      else if (v !== undefined) value = numberText(decode(v));
      while (row.length < at) row.push("");
      row[at] = value;
    }
    if (row.some((x) => String(x).trim() !== "")) rows.push(row);
  }
  return rows;
}
