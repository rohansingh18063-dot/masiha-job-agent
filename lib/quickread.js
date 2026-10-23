import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { ROLES } from "./roles-data";
import { SKILL_GROUPS } from "./roles-details";
import { INDIA_CITIES } from "./cities";
import { findRole, titleCase } from "./roles";
import { UserError } from "./errors";

/*
 * Reads an uploaded resume in well under a second, without AI, so the student can start straight away.
 * It finds the details the emails need most: name, email, phone, LinkedIn, city, job title and skills.
 * Jobs and education are filled in a few seconds later by Gemini, in the background (see the upload route).
 */

const MAX_PAGES = 10;
const READ_TIMEOUT_MS = 8000;

/**
 * Plain text of a PDF or Word file ("" if it has none, e.g. a scanned image).
 * A resume longer than 10 pages is refused, and reading stops after 8 seconds, so a specially made
 * file cannot keep the server busy.
 */
export async function resumeText(buf, isPdf) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), READ_TIMEOUT_MS); });
  const read = (async () => {
    if (!isPdf) return (await mammoth.extractRawText({ buffer: buf })).value || "";
    const pdf = await getDocumentProxy(new Uint8Array(buf), { isEvalSupported: false });
    if (pdf.numPages > MAX_PAGES) throw new UserError(`Your resume has ${pdf.numPages} pages. Please upload one with ${MAX_PAGES} pages or fewer.`);
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text || "");
  })();
  read.catch(() => {}); // if the timeout wins, a late failure is not an error
  try {
    return await Promise.race([read, timeout]);
  } catch (err) {
    if (err instanceof UserError) throw err;
    console.error("Could not read resume text", err.message);
    return "";
  } finally {
    clearTimeout(timer);
  }
}

// Every skill we know, longest first. Skipped: very short names (C, R, Go) and words that are usually
// languages or subjects in a resume ("English", "Science" from a college name), which match too much plain text.
const VAGUE = new Set(["english", "hindi", "science", "mathematics", "computer science", "teaching", "research", "content", "sales", "marketing", "operations"]);
const SKILLS = [...new Set([...ROLES.flatMap((r) => r.skills), ...Object.values(SKILL_GROUPS).flat()])]
  .filter((s) => (s.length > 2 || /[+#]/.test(s)) && !VAGUE.has(s.toLowerCase()))
  .sort((a, b) => b.length - a.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SKILL_RE = SKILLS.map((s) => [s, new RegExp(`(^|[^a-z0-9])${escape(s.toLowerCase())}(?![a-z0-9+#])`)]);

const CITIES = Object.entries(INDIA_CITIES).flatMap(([state, list]) => list.map((c) => [c.replace(/\s*\(.*\)$/, ""), state]))
  .sort((a, b) => b[0].length - a[0].length);

const NOT_A_NAME = /\b(resume|curriculum|vitae|cv|profile|summary|objective|developer|engineer|executive|manager|analyst|designer|accountant|teacher|intern|contact|email|phone|address)\b/i;

function findName(lines) {
  for (const line of lines.slice(0, 6)) {
    const t = line.replace(/\s+/g, " ").trim();
    const words = t.split(" ");
    if (words.length < 2 || words.length > 4 || !/^[A-Za-z.' -]+$/.test(t) || NOT_A_NAME.test(t)) continue;
    return t === t.toUpperCase() || t === t.toLowerCase() ? titleCase(t.toLowerCase()) : t;
  }
  return "";
}

async function findTitle(lines) {
  // The job title is usually a short line near the top, just under the name.
  for (const line of lines.slice(0, 12)) {
    if (line.split(/\s+/).length > 6) continue;
    const role = await findRole(line, { learned: false }); // built-in roles only: no database trips
    if (role?.title) return role.title;
  }
  return "";
}

/** Best-effort details from the resume text. name may be "" if none was found. */
export async function quickProfile(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const top = lines.slice(0, 15).join(" \n ");
  const lower = ` ${String(text).toLowerCase()} `;

  const email = (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [""])[0];
  const phone = ((text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/) || [""])[0]).trim();
  const linkedin = (text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i) || [""])[0];
  const city = CITIES.find(([c]) => new RegExp(`\\b${escape(c)}\\b`, "i").test(top));

  // Longest names win ("React Native" over "React"), then skills are listed in the order the resume has them.
  const hits = [];
  for (const [s, re] of SKILL_RE) {
    const m = re.exec(lower);
    if (m && !hits.some((h) => h.s.toLowerCase().includes(s.toLowerCase()))) hits.push({ s, at: m.index });
  }
  const skills = hits.sort((a, b) => a.at - b.at).map((h) => h.s).slice(0, 20);

  return {
    name: findName(lines),
    email,
    phone,
    linkedin,
    location: city ? `${city[0]}, ${city[1]}` : "",
    headline: await findTitle(lines),
    skills,
    experience: [],
    education: [],
  };
}
