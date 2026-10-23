import { ROLES } from "./roles-data";
import { query } from "./db";
import { askGeminiJson, UserError } from "./gemini";

/*
 * Finds the role pack for the job a student typed:
 * 1. the ready-made library (lib/roles-data.js),
 * 2. roles Gemini described before (learned_roles table),
 * 3. otherwise Gemini describes the new role once, and it is saved so nobody pays for it again.
 * Emails and chat-built resumes are then filled in from the pack, without Gemini.
 */


// Words that do not change which job it is: "fresher java developer job" is a Java Developer.
const FILLER = new Set([
  "fresher", "freshers", "junior", "jr", "senior", "sr", "trainee", "intern", "internship", "experienced",
  "job", "jobs", "role", "roles", "position", "post", "opening", "openings", "vacancy", "work", "career",
  "a", "an", "the", "for", "as", "in", "of", "i", "want", "looking", "any", "remote", "wfh", "onsite",
]);

const SHORT = { dev: "developer", devs: "developer", engg: "engineer", engr: "engineer", exe: "executive", exec: "executive", mgr: "manager", asst: "assistant" };

export function roleKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b(full|part)[\s-]?time\b|\bentry[\s-]?level\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .split(" ")
    .filter((w) => w && !FILLER.has(w))
    .map((w) => SHORT[w] || w)
    .join(" ");
}

const words = (key) => key.split(" ");
const hasFiller = (t) => String(t).toLowerCase().split(/[^a-z]+/).some((w) => FILLER.has(w));

/** The pack's title that best names this phrase: "data entry" -> "Data Entry Operator", "tally" -> "Tally Operator". */
function bestTitle(pack, key) {
  return pack.titles.find((t) => !hasFiller(t) && ` ${roleKey(t)} `.includes(` ${key} `)) || pack.titles[0];
}

// Every phrase we can match, longest first, so "java developer" wins over "developer".
// A title is shown as written only if it has no filler words ("HR Intern" would turn every "HR" into an intern).
const PHRASES = ROLES.flatMap((pack) => [
  ...pack.titles.map((t) => ({ key: roleKey(t), pack, title: hasFiller(t) ? null : t })),
  ...pack.keywords.map((k) => ({ key: roleKey(k), pack, title: null })),
]).filter((p) => p.key).sort((a, b) => b.key.length - a.key.length);

const ACRONYMS = new Set(["hr", "it", "ui", "ux", "qa", "qc", "seo", "sem", "smm", "bpo", "mis", "ai", "ml", "sde", "gst", "tds", "sap", "erp", "aws", "sql", "php", "ios", "api", "crm", "cad", "plc", "vlsi", "ece", "eee", "pgt", "tgt", "prt", "mern", "mean", "bde", "bdm", "ca", "cs", "nlp", "bi", "sre", "gis", "hse", "ehs", "ehs", "mba"]);

const SMALL = new Set(["and", "of", "in", "for", "to", "at", "on"]);

/** "hr executive" -> "HR Executive", "sales and marketing executive" -> "Sales and Marketing Executive" */
export function titleCase(text) {
  return String(text || "")
    .split(" ")
    .filter(Boolean)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return w.toUpperCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

async function learnedRole(key) {
  const { rows } = await query("SELECT pack FROM learned_roles WHERE key = $1", [key]);
  return rows[0]?.pack || null;
}

/**
 * Returns { pack, title } for the job text, or null when we have nothing for it yet.
 * title is what the email and resume call the job.
 */
export async function findRole(text, { learned = true } = {}) {
  const key = roleKey(text);
  if (!key) return null;

  const exact = PHRASES.find((p) => p.key === key);
  if (exact) return { pack: exact.pack, title: exact.title || bestTitle(exact.pack, key) };

  const saved = learned ? await learnedRole(key) : null;
  if (saved) return { pack: saved, title: saved.titles[0] };

  // A known job inside a longer title, e.g. "react frontend developer" or "sales and marketing executive".
  // We keep the student's own words when the extra words look like real words (not "b com" from "B.Com accountant").
  const padded = ` ${key} `;
  const part = PHRASES.find((p) => padded.includes(` ${p.key} `));
  if (part) {
    const extra = words(key).filter((w) => !words(part.key).includes(w));
    const ownWords = words(key).length <= 5 && extra.length <= 2 && extra.every((w) => /^[a-z+#]{3,}$/.test(w) || ACRONYMS.has(w));
    return { pack: part.pack, title: ownWords ? titleCase(key) : part.title || bestTitle(part.pack, part.key) };
  }
  return null;
}

// Gemini's role text is shared with everyone who types the same job, so only plain wording gets through:
// no links, email addresses, domains or unusual symbols, and anything that reads like an instruction is dropped.
const SUSPICIOUS = /(https?:|www\.|@|\.(com|in|net|org|io|xyz)\b|click|visit|contact us|whatsapp|telegram|call\s*\+?\d|ignore|instruction|prompt)/i;
const clip = (v, max) => {
  const t = String(v ?? "")
    .replace(/[^\p{L}\p{N} ,.&/()'’+#:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return SUSPICIOUS.test(t) ? "" : t;
};

function cleanPack(raw, text) {
  const title = clip(raw?.title, 60) || titleCase(roleKey(text)) || "Professional";
  const focus = clip(raw?.focus, 140).replace(/^i enjoy\s+/i, "").replace(/[.!]+$/, "");
  const team = clip(raw?.team, 40).replace(/^your\s+/i, "").replace(/[.!]+$/, "");
  let traits = clip(raw?.traits, 200);
  if (traits && !/[.!]$/.test(traits)) traits += ".";
  return {
    id: `learned:${roleKey(text)}`,
    titles: [title],
    keywords: [],
    focus: focus ? focus[0].toLowerCase() + focus.slice(1) : GENERIC.focus,
    team: team ? team.toLowerCase().replace(/\b(hr|it|qa|ui|ux)\b/g, (w) => w.toUpperCase()) : GENERIC.team,
    traits: traits || GENERIC.traits,
    skills: (Array.isArray(raw?.skills) ? raw.skills : []).map((s) => clip(s, 40)).filter(Boolean).slice(0, 12),
    strengths: (Array.isArray(raw?.strengths) ? raw.strengths : []).map((s) => clip(s, 60).replace(/[.!]+$/, "")).filter(Boolean).slice(0, 8),
    bullets: (Array.isArray(raw?.bullets) ? raw.bullets : []).map((s) => clip(s, 140).replace(/[.!]+$/, "")).filter(Boolean).slice(0, 8),
  };
}

const GENERIC = {
  focus: "doing careful, good-quality work and learning quickly",
  team: "team",
  traits: "Hard-working, reliable and quick to learn.",
};

function learnPrompt(text) {
  return `You help Indian job seekers write outreach emails and resumes. Describe the job below.
Return ONLY JSON: {"title": "", "focus": "", "team": "", "traits": "", "skills": [], "strengths": [], "bullets": []}
- title: the clean job title in Title Case, at most 6 words. If the text is not a clear job title, use the closest sensible one.
- focus: what a good person in this job enjoys doing. It must read well after the words "I enjoy". Start lower-case, at most 15 words, no full stop.
  Example for Accountant: "keeping accounts accurate, on time and easy to follow"
- team: the team this job belongs to, 1 to 3 lower-case words. Example: "accounts team"
- traits: one short resume line about how a good person in this job works, at most 15 words, without "I".
  Example: "Careful with numbers and keeps records accurate and on time."
- skills: 8 to 12 common skills or tools for this job.
- strengths: 8 core competencies for this job, 2 to 5 words each, in Title Case, the kind a resume lists. Example: "Bank Reconciliation"
- bullets: 8 typical things a person in this job does, as short resume points in the past tense, starting with an action verb,
  at most 12 words, no numbers, no full stop. Example: "Reconciled bank statements with the books"
JOB TEXT: ${JSON.stringify(String(text).slice(0, 80))}`;
}

const inFlight = new Map();

/**
 * Like findRole, but asks Gemini to describe a new role once and saves it.
 * Never fails: if Gemini is not available, a plain pack is used (and not saved, so we try again later).
 */
export async function resolveRole(userId, text) {
  const found = await findRole(text);
  if (found) return found;
  const key = roleKey(text);
  if (!key) return { pack: { ...GENERIC, titles: ["a suitable role"], keywords: [], skills: [], strengths: [], bullets: [] }, title: "" };

  if (!inFlight.has(key)) {
    inFlight.set(key, (async () => {
      try {
        const raw = await askGeminiJson(userId, [{ text: learnPrompt(text) }], () => ({ title: titleCase(key) }));
        const pack = cleanPack(raw, text);
        await query(
          "INSERT INTO learned_roles (key, pack) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET pack = EXCLUDED.pack",
          [key, JSON.stringify(pack)],
        );
        return { pack, title: pack.titles[0] };
      } catch (err) {
        if (!(err instanceof UserError)) console.error("Could not describe role", key, err);
        const pack = cleanPack({}, text);
        return { pack, title: pack.titles[0] };
      } finally {
        inFlight.delete(key);
      }
    })());
  }
  return inFlight.get(key);
}

/** "a" or "an" for a job title: an Accountant, an HR Executive, a UI/UX Designer. */
export function article(title) {
  const w = String(title || "").split(/[\s/]/)[0];
  if (/^[A-Z]{2,}$/.test(w)) return /^[AEFHILMNORSX]/.test(w) ? "an" : "a";
  if (/^(uni|use|usu|eu|one)/i.test(w)) return "a";
  if (/^(hour|honest)/i.test(w)) return "an";
  return /^[aeiou]/i.test(w) ? "an" : "a";
}
