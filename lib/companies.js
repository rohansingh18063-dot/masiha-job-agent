import { promises as dns } from "node:dns";
import { query, tx } from "./db";
import { matchState } from "./states";
import { canonicalCity } from "./cities";

let cache = { version: null, list: [] };

/**
 * All companies. Kept in memory and re-read only when the companies table changes
 * (every change bumps app_meta.companies_version, so other servers notice too). Do not mutate the result.
 */
export async function allCompanies() {
  const { rows } = await query("SELECT value FROM app_meta WHERE key = 'companies_version'");
  const version = rows[0]?.value || "0";
  if (version !== cache.version) {
    const all = await query("SELECT data FROM companies");
    cache = { version, list: all.rows.map((r) => r.data) };
  }
  return cache.list;
}

async function bumpVersion(db) {
  await db.query(
    `INSERT INTO app_meta (key, value) VALUES ('companies_version', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`],
  );
}

/** Inserts or replaces company rows, 500 at a time. */
export async function upsertCompanies(db, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const values = chunk.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4}::jsonb)`).join(", ");
    await db.query(
      `INSERT INTO companies (id, state, city, data) VALUES ${values}
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, city = EXCLUDED.city, data = EXCLUDED.data, updated_at = now()`,
      chunk.flatMap((c) => [c.id, c.state, c.city, JSON.stringify(c)]),
    );
  }
  await bumpVersion(db);
}

/** Minimal CSV parser (handles quotes, commas and new lines inside quotes). */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

// Which sheet header feeds which field. Headers are compared lower-case with spaces and symbols removed,
// so "Best Email (HR first)" becomes "bestemailhrfirst". The old 7-column CSV still works too.
const FIELDS = [
  ["name", (h) => ["company", "companyname", "name"].includes(h)],
  ["website", (h) => ["website", "websiteurl", "site", "url"].includes(h)],
  ["emailType", (h) => h === "emailtype"],
  ["email1", (h) => h.startsWith("bestemail") || ["email", "email1", "hremail", "primaryemail"].includes(h)],
  ["email2", (h) => h === "email2"],
  ["email3", (h) => h === "email3"],
  ["hrGuess", (h) => h.startsWith("likelyhremail") || h.includes("guess")],
  ["foundOn", (h) => h.startsWith("emailfoundon") || h === "foundon"],
  ["careerPage", (h) => h.startsWith("career")],
  ["contactPage", (h) => h.startsWith("contactpage")],
  ["phone", (h) => h.startsWith("phone") || h === "mobile"],
  ["address", (h) => h.startsWith("address")],
  ["city", (h) => h === "city"],
  ["state", (h) => h === "state"],
  ["linkedin", (h) => h.startsWith("linkedin")],
  ["trust", (h) => h.startsWith("trust")],
  ["notes", (h) => h.startsWith("note")],
  ["source", (h) => h === "source"],
  ["updated", (h) => h.startsWith("updated") || h === "lastupdated"],
  ["industry", (h) => h === "industry"],
  ["about", (h) => h === "about"],
];

const normHeader = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function mapHeader(row) {
  const map = {};
  row.forEach((cell, i) => {
    const h = normHeader(cell);
    if (!h) return;
    const field = FIELDS.find(([name, test]) => map[name] === undefined && test(h));
    if (field) map[field[0]] = i;
  });
  return map;
}

const hostOf = (url) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

async function hasMx(domain) {
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000));
    const mx = await Promise.race([dns.resolveMx(domain), timeout]);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

/** Runs fn over items with at most `limit` running at once. */
async function eachLimit(items, limit, fn) {
  let i = 0;
  const worker = async () => { while (i < items.length) await fn(items[i++]); };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const emailsIn = (s) => (String(s || "").match(EMAIL_RE) || []).map((e) => e.toLowerCase().replace(/\.$/, ""));
const clip = (s, max = 300) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Turns the sheet's trust value into 0-100.
 * Accepts 85, "85%", 0.85, 8.5 (out of 10), 4 (out of 5) or words like High / Medium / Low.
 */
export function parseTrust(raw) {
  const s = clip(raw, 40);
  if (!s) return { trust: null, trustText: "" };
  const num = s.match(/-?\d+(\.\d+)?/);
  if (num) {
    let n = parseFloat(num[0]);
    const outOf = s.match(/\/\s*(\d+)/);
    if (outOf) n = (n / Number(outOf[1])) * 100;
    else if (!s.includes("%")) {
      if (n <= 1 && num[1]) n *= 100;
      else if (n <= 5 && Number.isInteger(n)) n *= 20;
      else if (n <= 10) n *= 10;
    }
    const trust = Math.round(Math.max(0, Math.min(100, n)));
    return { trust, trustText: `${trust}%` };
  }
  const word = s.toLowerCase();
  const trust = /very high|excellent|verified/.test(word) ? 90 : /high|good|strong/.test(word) ? 80
    : /med|average|moderate|ok/.test(word) ? 60 : /very low|bad/.test(word) ? 15 : /low|weak|poor/.test(word) ? 30 : null;
  return { trust, trustText: s.charAt(0).toUpperCase() + s.slice(1) };
}

/** Excel stores dates as day numbers (e.g. 45678). Turns those into YYYY-MM-DD. */
function dateText(v) {
  const s = clip(v, 40);
  if (/^\d{5}(\.\d+)?$/.test(s) && Number(s) > 20000 && Number(s) < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000).toISOString().slice(0, 10);
  }
  return s;
}

const url = (v) => clip(v, 300);

/**
 * Imports companies from rows (first matching row is the header). Works with CSV and Excel.
 * Needs: Company, State, City and at least one email. Rows with the same company and city are merged.
 */
export async function importRows(rows, { replace = false } = {}) {
  if (!rows.length) return { added: 0, updated: 0, skipped: 0, errors: ["The file is empty."] };

  // The header is the first row (of the first 10) that has Company and City columns.
  let headerAt = rows.slice(0, 10).findIndex((r) => {
    const m = mapHeader(r);
    return m.name !== undefined && m.city !== undefined;
  });
  if (headerAt === -1) headerAt = 0;
  const col = mapHeader(rows[headerAt]);
  const need = { name: "Company", state: "State", city: "City" };
  const missing = Object.keys(need).filter((k) => col[k] === undefined).map((k) => need[k]);
  if (col.email1 === undefined && col.email2 === undefined && col.hrGuess === undefined) missing.push("Best Email (HR first)");
  if (missing.length) return { added: 0, updated: 0, skipped: 0, errors: [`Missing columns: ${missing.join(", ")}`] };

  const errors = [];
  const grouped = new Map();
  rows.slice(headerAt + 1).forEach((r, i) => {
    const get = (k) => (col[k] === undefined ? "" : String(r[col[k]] ?? "").trim());
    const rowNo = headerAt + i + 2;
    const name = clip(get("name"), 120);
    const state = matchState(get("state"));
    const city = canonicalCity(state, clip(get("city"), 60)); // "bhopal" -> "Bhopal", "Bombay" -> "Mumbai"
    const real = [...new Set([...emailsIn(get("email1")), ...emailsIn(get("email2")), ...emailsIn(get("email3"))])];
    const guess = emailsIn(get("hrGuess"))[0] || "";

    if (!name || !city) return errors.push(`Row ${rowNo}: needs a company name and city.`);
    if (!state) return errors.push(`Row ${rowNo}: "${clip(get("state"), 40) || "(empty)"}" is not an Indian state.`);
    if (!real.length && !guess) return errors.push(`Row ${rowNo}: needs at least one email.`);

    const id = slug(`${name}-${city}`);
    const prev = grouped.get(id) || {};
    const pick = (k, v) => v || prev[k] || "";
    const { trust, trustText } = parseTrust(get("trust"));
    const emails = [...new Set([...(prev.guessed ? [] : prev.emails || []), ...real])].slice(0, 3);
    grouped.set(id, {
      id, name, state, city,
      website: pick("website", url(get("website"))),
      emails: emails.length ? emails : [guess || prev.emails?.[0]].filter(Boolean),
      guessed: !emails.length,
      hrGuess: pick("hrGuess", guess),
      emailType: pick("emailType", clip(get("emailType"), 60)),
      foundOn: pick("foundOn", url(get("foundOn"))),
      careerPage: pick("careerPage", url(get("careerPage"))),
      contactPage: pick("contactPage", url(get("contactPage"))),
      phone: pick("phone", clip(get("phone"), 60)),
      address: pick("address", clip(get("address"), 300)),
      linkedin: pick("linkedin", url(get("linkedin"))),
      trust: trust ?? prev.trust ?? null,
      trustText: trustText || prev.trustText || "",
      notes: pick("notes", clip(get("notes"), 500)),
      source: pick("source", clip(get("source"), 200)),
      updated: pick("updated", dateText(get("updated"))),
      industry: pick("industry", clip(get("industry"), 80)),
      about: pick("about", clip(get("about"), 400)),
    });
  });

  // Verified: the email domain matches the website, and that domain can receive mail.
  const list = [...grouped.values()];
  const mx = new Map();
  for (const c of list) {
    const site = hostOf(c.website);
    const domains = [...new Set(c.emails.map((e) => e.split("@")[1]))];
    c.verified = Boolean(site) && !c.guessed && domains.every((d) => d === site || d.endsWith(`.${site}`) || site.endsWith(`.${d}`));
    if (c.verified) domains.forEach((d) => mx.set(d, null));
  }
  await eachLimit([...mx.keys()], 40, async (d) => mx.set(d, await hasMx(d)));
  for (const c of list) {
    if (c.verified) c.verified = c.emails.every((e) => mx.get(e.split("@")[1]));
  }

  let added = 0, updated = 0;
  await tx(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(727402)"); // one import at a time
    if (replace) await db.query("DELETE FROM companies");
    const { rows } = await db.query("SELECT id, data FROM companies WHERE id = ANY($1)", [list.map((c) => c.id)]);
    const before = new Map(rows.map((r) => [r.id, r.data]));
    const now = new Date().toISOString();
    const out = list.map((c) => {
      const prev = before.get(c.id);
      if (prev) { updated++; return { ...prev, ...c, importedAt: now }; }
      added++;
      return { ...c, addedAt: now, importedAt: now };
    });
    await upsertCompanies(db, out);
  });

  return { added, updated, skipped: errors.length, errors: errors.slice(0, 20), moreErrors: Math.max(0, errors.length - 20) };
}

export async function deleteAllCompanies() {
  await tx(async (db) => {
    await db.query("DELETE FROM companies");
    await bumpVersion(db);
  });
}

export async function deleteCompany(id) {
  return tx(async (db) => {
    const { rowCount } = await db.query("DELETE FROM companies WHERE id = $1", [id]);
    if (rowCount) await bumpVersion(db);
    return rowCount > 0;
  });
}

/** True when every word of the query appears somewhere in the company's main details. */
export function matchesQuery(c, q) {
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [c.name, c.city, c.state, c.website, c.industry, ...(c.emails || [])].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Higher trust first, then verified, then A to Z. */
export function byTrust(a, b) {
  return (b.trust ?? -1) - (a.trust ?? -1) || Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name);
}
