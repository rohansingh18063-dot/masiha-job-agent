import { article, titleCase } from "./roles";
import { ROLES } from "./roles-data";

/*
 * Fills emails and resumes from a role pack (see lib/roles.js), without Gemini.
 * Only facts the student gave us are used. The pack adds wording, never skills or experience.
 */

const andList = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** Up to n of the student's own skills, the ones that fit this job first. */
function relevantSkills(profile, pack, n) {
  const typical = pack.skills.map((s) => s.toLowerCase());
  const fits = (s) => typical.some((t) => t === s.toLowerCase() || s.toLowerCase().includes(t) || t.includes(s.toLowerCase()));
  const skills = profile.skills || [];
  return [...skills.filter(fits), ...skills.filter((s) => !fits(s))].slice(0, n);
}

const isStudying = (e) => /pursuing|present|current|ongoing|till date|now/i.test(`${e.period} ${e.details}`)
  || Number((e.period.match(/(\d{4})\s*$/) || [])[1]) > new Date().getFullYear();

/** ", with experience as Sales Intern at ABC" / ", with a B.Com from XYZ College" / "" */
function background(profile) {
  const job = profile.experience?.[0];
  if (job?.role && job?.company) return `, with experience as ${job.role} at ${job.company}`;
  if (job?.company) return `, with work experience at ${job.company}`;
  if (job?.role) return `, with experience as ${job.role}`;
  const edu = profile.education?.[0];
  if (edu?.degree) {
    const from = edu.school ? ` from ${edu.school}` : "";
    if (isStudying(edu)) return `, currently studying ${edu.degree}${edu.school ? ` at ${edu.school}` : ""}`;
    if (/^(10th|12th|class|ssc|hsc|high school|intermediate|matric|diploma)/i.test(edu.degree)) return `, and I have completed my ${edu.degree}${from}`;
    return `, with ${article(edu.degree)} ${edu.degree}${from}`;
  }
  return "";
}

const signature = (p) => ["Regards,", p.name, p.phone, p.email].filter(Boolean).join("\n");

const FRAMES = [
  ({ p, c, title, a, bg, skills, pack }) => ({
    subject: `Application for ${title} role - ${p.name}`,
    body: [
      `Dear Hiring Team at ${c.name},`,
      `I am ${p.name}${bg}. I am writing to ask whether ${c.name} has a place for me as ${a} ${title}${c.city ? ` in ${c.city}` : ""}.`,
      `I enjoy ${pack.focus}, and I would love to bring that to your ${pack.team}.${skills ? ` My main skills are ${skills}.` : ""}`,
      "Even if there is no opening right now, I would be grateful to be considered for upcoming roles. I have attached my resume for your reference.",
      signature(p),
    ],
  }),
  ({ p, c, title, bg, skills, pack }) => ({
    subject: `Interested in ${title} opportunities at ${c.name}`,
    body: [
      `Dear Hiring Team at ${c.name},`,
      `I am reaching out to express my interest in ${title} opportunities at ${c.name}. My name is ${p.name}${bg}.`,
      `${skills ? `My strengths include ${skills}, and I` : "I"} enjoy ${pack.focus}. I am keen to keep learning and to contribute to your ${pack.team} from day one.`,
      "If there is a current or upcoming opening, I would be glad to be considered. My resume is attached, and I am happy to share anything else you need.",
      "Thank you for your time.",
      signature(p),
    ],
  }),
  ({ p, c, title, a, bg, skills, pack }) => ({
    subject: `${p.name} - ${title}${c.city ? `, ${c.city}` : ""}`,
    body: [
      `Dear Hiring Team at ${c.name},`,
      `I hope you are doing well. I am ${p.name}${bg}, and I am looking for ${a} ${title} role${c.city ? ` in ${c.city}` : ""}. I would be glad to have the chance to work with ${c.name}.`,
      `${skills ? `I bring skills in ${skills}. ` : ""}I enjoy ${pack.focus}, and I take care to do every task properly and on time.`,
      `I would be grateful if you could keep me in mind for any current or future opening in your ${pack.team}. I have attached my resume for your reference.`,
      signature(p),
    ],
  }),
];

export const EMAIL_VARIANTS = FRAMES.length;

/** Different companies get different wording, so HR teams do not all see the same email. */
export function variantFor(companyId) {
  let h = 0;
  for (const ch of String(companyId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % FRAMES.length;
}

export function emailFromRole({ pack, title }, profile, company, variant = 0) {
  const { subject, body } = FRAMES[variant % FRAMES.length]({
    p: profile,
    c: company,
    title,
    a: article(title),
    bg: background(profile),
    skills: andList(relevantSkills(profile, pack, 3)),
    pack,
  });
  return { subject, body: body.join("\n\n") };
}

/* ---------------- Resume from chat answers ---------------- */

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s*'?)?\\d{4}`;
const PERIOD_RE = new RegExp(`(${DATE}\\s*(?:-|–|to)\\s*(?:${DATE}|present|now|current|till date|ongoing)|${MONTH}\\s*'?\\d{2,4}|\\b\\d{4}\\b|\\b\\d+\\s*(?:months?|years?|yrs?)\\b)`, "i");
const SCORE_RE = /(\b\d{1,3}(?:\.\d+)?\s*%|\b\d{1,2}(?:\.\d+)?\s*(?:cgpa|sgpa|gpa)\b|\b(?:cgpa|sgpa|gpa)\s*:?\s*\d{1,2}(?:\.\d+)?)/i;
const NONE_RE = /^(fresher|none|no|nil|na|n\/a|-|skip|nothing|no experience|not yet|fresh graduate)\.?$/i;

// Canonical spelling for skills people type in lower case: "react" -> "React", "ms excel" -> "MS Excel".
const SKILL_CASE = new Map(ROLES.flatMap((r) => r.skills).map((s) => [s.toLowerCase(), s]));

const tidy = (s) => String(s || "").replace(/\s+/g, " ").replace(/^[\s\-*•·,.;:]+|[\s,;:]+$/g, "").trim();
const sentence = (s) => { s = tidy(s).replace(/\.+$/, ""); return s ? s[0].toUpperCase() + s.slice(1) : ""; };
const lines = (s) => String(s || "").split(/\n|;|(?:^|\s)•\s*/).map(tidy).filter(Boolean);
const niceCase = (s) => (s && s === s.toLowerCase() ? titleCase(s) : s);

function takePeriod(text) {
  const m = text.match(PERIOD_RE);
  if (!m) return { period: "", rest: text };
  return { period: tidy(m[0]).replace(/\s*(?:-|–|to)\s*/i, " - "), rest: tidy(text.replace(m[0], " ").replace(/\(\s*\)/g, "")) };
}

function parseSkills(text) {
  const seen = new Set();
  return String(text || "")
    .split(/[,;\n|•/]+|\s+and\s+|\s+&\s+/i)
    .map(tidy)
    .filter((s) => s && s.length <= 50)
    .map((s) => SKILL_CASE.get(s.toLowerCase()) || (s === s.toLowerCase() ? s[0].toUpperCase() + s.slice(1) : s))
    .filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 20);
}

// "Sales Intern at ABC Pvt Ltd, Jan 2024 - Jun 2024, handled walk-in customers"
function parseJob(line) {
  const { period, rest } = takePeriod(line);
  const parts = rest.split(/,\s*/).map(tidy).filter(Boolean);
  let role = "", company = "";
  const at = (parts[0] || "").match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) {
    [role, company] = [at[1], at[2]];
    parts.shift();
  } else {
    role = parts.shift() || "";
    if (parts[0] && parts[0].split(" ").length <= 6) company = parts.shift();
  }
  return { role: niceCase(tidy(role)), company: tidy(company), period, points: parts.map(sentence).filter(Boolean) };
}

// "B.Com, Barkatullah University, 2021 - 2024, 72%"
function parseEducation(line) {
  const score = (line.match(SCORE_RE) || [])[0] || "";
  const { period, rest } = takePeriod(score ? line.replace(score, " ") : line);
  let parts = rest.split(/,\s*/).map(tidy).filter(Boolean);
  const from = (parts[0] || "").match(/^(.+?)\s+(?:from|at)\s+(.+)$/i);
  if (from) parts = [from[1], from[2], ...parts.slice(1)];
  const [degree = "", school = "", ...more] = parts;
  return { degree, school, period, details: [score.replace(/\s+/g, " "), ...more].filter(Boolean).join(", ") };
}

// "Expense Tracker - a React app to log daily spending"
function parseProject(line, i) {
  const m = line.match(/^(.{2,80}?)\s*(?:\s-\s|\s–\s|:)\s*(.+)$/);
  if (m) return { name: tidy(m[1]), points: [sentence(m[2])] };
  if (line.split(" ").length <= 8) return { name: tidy(line), points: [] };
  return { name: `Project ${i + 1}`, points: [sentence(line)] };
}

function findContact(text) {
  const email = (String(text).match(/[^\s,;:<>()]+@[^\s,;:<>()]+\.[a-z]{2,}/i) || [""])[0];
  const phone = (String(text).replace(email, " ").match(/\+?\d[\d\s-]{8,14}\d/) || [""])[0].replace(/[\s-]+/g, " ").trim();
  return { email, phone };
}

// How a picked soft strength reads after "Known for …".
const SOFT_PHRASE = {
  Communication: "clear communication", Teamwork: "teamwork", "Problem Solving": "problem solving", "Time Management": "good time management",
  "Quick Learner": "learning quickly", "Attention to Detail": "attention to detail", Adaptability: "adaptability", Leadership: "leadership",
};
const SCHOOL_LEVEL = /^(10th|12th|class|ssc|hsc|high school|intermediate|matric)/i;
const degreeText = (d) => d.replace(/,\s*/, " in "); // "B.Tech, Computer Science" -> "B.Tech in Computer Science"

/** A 4 to 5 sentence professional summary, built only from the student's own facts plus the role's wording. */
function summary(profile, pack, title) {
  const job = profile.experience[0];
  const edu = profile.education[0];
  const skills = relevantSkills(profile, pack, 5);
  const school = edu?.school ? edu.school.split(",")[0] : "";
  const degree = edu?.degree ? degreeText(edu.degree) : "";
  const college = degree && !SCHOOL_LEVEL.test(degree) ? `${article(degree)} ${degree}${school ? ` from ${school}` : ""}` : "";

  let first;
  if (job && (job.role || job.company)) {
    const at = job.company ? ` at ${job.company}${college && job.company.includes(",") ? "," : ""}` : "";
    first = `${title} with hands-on experience${job.role ? ` as ${job.role}` : ""}${at}${college ? ` and ${college}` : ""}.`;
  } else if (degree && isStudying(edu)) {
    first = `Motivated ${title}, currently pursuing ${degree}${school ? ` at ${school}` : ""}.`;
  } else if (college) {
    first = `Motivated ${title} with ${college}, ready to start a full-time career.`;
  } else if (degree) {
    first = `Motivated ${title} who has completed ${degree}${school ? ` from ${school}` : ""}, ready to start a full-time career.`;
  } else {
    first = `Motivated ${title}, ready to start a full-time career.`;
  }

  const soft = (profile.strengths || []).map((s) => SOFT_PHRASE[s]).filter(Boolean).slice(0, 3);
  return [
    first,
    skills.length ? `Skilled in ${andList(skills)}, with a focus on ${pack.focus}.` : `Focused on ${pack.focus}.`,
    pack.traits,
    soft.length ? `Known for ${andList(soft)}.` : "",
    `Eager to contribute to ${article(pack.team)} ${pack.team}, take ownership of work and keep learning on the job.`,
  ].filter(Boolean).join(" ");
}

/** Tidies a work point the student typed: "i have handled billing." -> "Handled billing" */
function point(s) {
  let t = tidy(s).replace(/\.+$/, "");
  t = t.replace(/^(?:i\s+(?:have|had|was|am)\s+|i\s+|my\s+(?:role|job|work)\s+(?:was|is)\s+(?:to\s+)?)/i, "").replace(/\bi\b/g, "I");
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/** "7.02" -> "CGPA: 7.02", "72" -> "Percentage: 72%" */
function marks(m) {
  const t = tidy(m);
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t) <= 10 ? `CGPA: ${t}` : `Percentage: ${t}%`;
  const pct = t.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pct) return `Percentage: ${pct[1]}%`;
  const gpa = t.match(/^(\d+(?:\.\d+)?)\s*(cgpa|sgpa|gpa)$/i);
  if (gpa) return `${gpa[2].toUpperCase()}: ${gpa[1]}`;
  return t;
}

const uniq = (items, max) => {
  const seen = new Set();
  return items.map(tidy).filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).slice(0, max);
};

/** Builds the resume from the 9 chat answers in the same fixed format for everyone. */
/* The chat builder sends forms (objects and lists). Older clients sent one line of text per question. */

const monthYear = (v) => (v && typeof v === "object" ? [v.month, v.year].map(tidy).filter(Boolean).join(" ") : tidy(v));
const range = (a, b) => (a && b ? `${a} - ${b}` : a || b || "");
const isForm = (v) => v && typeof v === "object";

const educationFromForm = (e) => ({
  degree: [tidy(e.degree), tidy(e.stream)].filter(Boolean).join(", "),
  school: [tidy(e.school), tidy(e.board)].filter(Boolean).join(", "),
  period: range(tidy(e.start), tidy(e.end)),
  details: marks(e.marks),
});

const jobFromForm = (e) => {
  const type = tidy(e.type);
  const period = range(monthYear(e.start), e.current ? "Present" : monthYear(e.end));
  return {
    role: tidy(e.role),
    company: [tidy(e.company), tidy(e.city)].filter(Boolean).join(", "),
    period: [period, type && type !== "Full-time" ? `(${type})` : ""].filter(Boolean).join(" "),
    // The best result goes first: recruiters and ATS software look for numbers.
    points: uniq([point(e.result), ...lines(e.work).map(point)], 8),
  };
};

const projectFromForm = (p) => ({
  name: tidy(p.name),
  points: [...lines(p.about).map(point), p.tools ? `Built with ${tidy(p.tools)}` : "", p.link ? `Link: ${tidy(p.link)}` : ""].filter(Boolean),
});

const fromAnswer = (value, fromForm, fromText) => {
  if (Array.isArray(value)) return value.filter(isForm).map(fromForm);
  if (isForm(value)) return [fromForm(value)].flat();
  return NONE_RE.test(tidy(value)) ? [] : fromText(String(value || ""));
};

export function profileFromAnswers(answers, role) {
  const name = tidy(answers.name);
  const contact = isForm(answers.contact) ? { email: tidy(answers.contact.email), phone: tidy(answers.contact.phone) } : findContact(answers.contact);
  const experience = fromAnswer(answers.experience, jobFromForm, (t) => lines(t).map(parseJob)).filter((e) => e.role || e.company);
  const projects = fromAnswer(answers.projects, projectFromForm, (t) => lines(t).map(parseProject)).filter((p) => p.name);
  const x = isForm(answers.extras) && !Array.isArray(answers.extras) ? answers.extras : null;
  const extras = x ? [] : fromAnswer(answers.extras, () => [], (t) => t.split(/\n|;|,\s*/).map(sentence).filter(Boolean));
  const st = isForm(answers.strengths) ? answers.strengths : {};
  const strengths = uniq([...(Array.isArray(st.picked) ? st.picked : []), ...String(st.own || "").split(",")], 12);
  const education = fromAnswer(answers.education, educationFromForm, (t) => lines(t).map(parseEducation)).filter((e) => e.degree);

  const profile = {
    name: name === name.toLowerCase() || name === name.toUpperCase() ? titleCase(name) : name,
    email: contact.email,
    phone: contact.phone,
    linkedin: isForm(answers.contact) ? tidy(answers.contact.linkedin) : "",
    location: niceCase(tidy(answers.city)),
    headline: role.title,
    summary: "",
    skills: parseSkills(answers.skills),
    strengths,
    experience,
    projects,
    education,
    certifications: x ? lines(x.certificates).map(sentence) : [],
    achievements: x ? lines(x.achievements).map(point) : [],
    languages: x && Array.isArray(x.languages) ? uniq(x.languages, 10) : [],
    extras,
  };
  profile.summary = summary(profile, role.pack, role.title || "Professional");
  return profile;
}
