import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SKILL_GROUPS } from "./roles-details";

export const RESUME_SHAPE = `{
  "name": "Full name",
  "email": "email or empty",
  "phone": "phone or empty",
  "linkedin": "LinkedIn profile link or empty",
  "location": "City, State",
  "headline": "Short professional title, e.g. Frontend Developer",
  "summary": "4 to 5 sentence professional summary",
  "skills": ["tool, software or subject", "..."],
  "strengths": ["core competency, 2 to 5 words", "..."],
  "experience": [{ "role": "", "company": "", "period": "Mon YYYY - Mon YYYY", "points": ["achievement or duty", "..."] }],
  "projects": [{ "name": "", "points": ["", "..."] }],
  "education": [{ "degree": "", "school": "", "period": "", "details": "marks, e.g. CGPA: 8.1" }],
  "certifications": ["", "..."],
  "achievements": ["", "..."],
  "languages": ["English", "..."],
  "extras": ["anything that fits nowhere else", "..."]
}`;

const WRITING_RULES = `Rules:
- Use only facts the person gave. Never invent companies, degrees, dates, numbers, skills or certificates.
- Improve wording: clear, confident, professional English. Start bullet points with action verbs. Keep any numbers they gave.
- Keep bullet points short (one line each). The summary is 50 to 80 words and names the job title and main skills.
- strengths: 6 to 10 core competencies clearly supported by the resume (they help ATS software match the resume).
- Use empty strings or empty arrays for anything not given.
- Return ONLY JSON in exactly this shape:
${RESUME_SHAPE}`;

/*
 * Uploaded resumes are kept exactly as the student made them. We only copy out the few details the
 * outreach emails need, word for word, which keeps the answer short and quick.
 */
export const UPLOAD_PROMPT = `Read the attached resume and copy out these details exactly as they are written.
Do not rewrite, improve, shorten or add anything. Use "" or [] for anything that is not in the resume.
Return ONLY JSON in exactly this shape:
{
  "name": "", "email": "", "phone": "", "linkedin": "", "location": "",
  "headline": "the job title they want or their current job title",
  "skills": ["up to 20 skills, as listed"],
  "experience": [{ "role": "", "company": "", "period": "" }],
  "education": [{ "degree": "", "school": "", "period": "", "details": "" }]
}
At most 5 experience entries and 4 education entries, most recent first.`;

export function editPrompt(profile, instruction) {
  return `You are a professional resume writer. Update this resume exactly as the person asks. Change nothing else.

${WRITING_RULES}

CURRENT RESUME (JSON):
${JSON.stringify(profile)}

THE PERSON'S REQUEST:
${instruction}`;
}

const str = (v, max = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v, max = 30) => (Array.isArray(v) ? v : []).slice(0, max);

/** Makes any model output safe and predictable. */
export function normalizeProfile(p) {
  p = p && typeof p === "object" ? p : {};
  const out = {
    name: str(p.name, 80),
    email: str(p.email, 120),
    phone: str(p.phone, 40),
    linkedin: str(p.linkedin, 120),
    location: str(p.location, 80),
    headline: str(p.headline, 100),
    summary: str(p.summary, 900),
    skills: list(p.skills, 40).map((s) => str(s, 50)).filter(Boolean),
    strengths: list(p.strengths, 12).map((s) => str(s, 60)).filter(Boolean),
    experience: list(p.experience, 10).map((e) => ({
      role: str(e?.role, 100), company: str(e?.company, 100), period: str(e?.period, 40),
      points: list(e?.points, 8).map((x) => str(x, 240)).filter(Boolean),
    })).filter((e) => e.role || e.company),
    projects: list(p.projects, 8).map((e) => ({
      name: str(e?.name, 100), points: list(e?.points, 6).map((x) => str(x, 240)).filter(Boolean),
    })).filter((e) => e.name),
    education: list(p.education, 6).map((e) => ({
      degree: str(e?.degree, 120), school: str(e?.school, 120), period: str(e?.period, 40), details: str(e?.details, 200),
    })).filter((e) => e.degree || e.school),
    certifications: list(p.certifications, 10).map((x) => str(x, 160)).filter(Boolean),
    achievements: list(p.achievements, 10).map((x) => str(x, 200)).filter(Boolean),
    languages: list(p.languages, 10).map((x) => str(x, 40)).filter(Boolean),
    extras: list(p.extras, 12).map((x) => str(x, 160)).filter(Boolean),
    source: p.source === "upload" ? "upload" : "built", // "upload": the student's own file is their resume
    // While an upload is still being read in the background (jobs and education come a few seconds later).
    reading: p.reading === true,
    readId: str(p.readId, 20),
    readAt: str(p.readAt, 40),
  };
  if (!out.name) throw new Error("No name found");
  return out;
}

export function mockProfile(seed = {}) {
  return {
    name: seed.name || "Test User",
    email: seed.email || "test.user@example.com",
    phone: seed.phone || "",
    location: seed.city || "Bhopal, Madhya Pradesh",
    headline: seed.role || "Frontend Developer",
    summary: "Frontend developer who builds fast, clean and accessible web pages with React and modern CSS.",
    skills: ["React", "JavaScript", "HTML", "CSS", "Git"],
    experience: [{ role: "Web Development Intern", company: "Sample Studio", period: "2025", points: ["Built responsive landing pages in React", "Improved page load time by optimising images"] }],
    projects: [{ name: "Portfolio website", points: ["Personal site built with Next.js"] }],
    education: [{ degree: "B.Tech, Computer Science", school: "Sample Institute of Technology", period: "2021 - 2025", details: "" }],
    extras: ["English, Hindi"],
  };
}

/* ---------------- PDF ---------------- */

// Standard PDF fonts only cover Western characters; swap common symbols and drop the rest.
function pdfSafe(text) {
  return String(text || "")
    .replace(/₹/g, "Rs. ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}


/** Splits skills into ATS-friendly groups: "Frontend: HTML, CSS, React". Unknown skills go under "Other Skills". */
const groupKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9+#]/g, "");
const GROUP_OF = new Map(Object.entries(SKILL_GROUPS).flatMap(([group, items]) => items.map((s) => [groupKey(s), group])));
function groupSkills(skills) {
  const groups = new Map();
  for (const s of skills) {
    const g = GROUP_OF.get(groupKey(s)) || GROUP_OF.get(groupKey(s).replace(/js$/, "")) || "Other Skills";
    groups.set(g, [...(groups.get(g) || []), s]);
  }
  const order = [...Object.keys(SKILL_GROUPS), "Other Skills"];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

/*
 * One-column resume that ATS software reads cleanly: real text (no images or tables), standard fonts,
 * standard section names, dates on the same line as each job, and keywords in their own sections.
 */
export async function renderResumePdf(p) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${pdfSafe(p.name)} - ${pdfSafe(p.headline || "Resume")}`);
  doc.setAuthor(pdfSafe(p.name));
  doc.setSubject(pdfSafe(`${p.headline || ""} resume`.trim()));
  doc.setKeywords([...(p.skills || []), ...(p.strengths || [])].map(pdfSafe).slice(0, 40));
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 595.28, H = 841.89, M = 48, maxW = W - M * 2;
  const ink = rgb(0.07, 0.07, 0.12), muted = rgb(0.36, 0.35, 0.45), accent = rgb(0.36, 0.24, 0.96), rule = rgb(0.86, 0.84, 0.93);
  let page = doc.addPage([W, H]);
  let y = H - M;

  const ensure = (h) => {
    if (y - h < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };

  const wrap = (text, font, size, width) => {
    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    const out = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  };

  const write = (text, { font = regular, size = 10.5, color = ink, indent = 0, gap = 4.2 } = {}) => {
    for (const ln of wrap(text, font, size, maxW - indent)) {
      ensure(size + gap);
      page.drawText(ln, { x: M + indent, y: y - size, size, font, color });
      y -= size + gap;
    }
  };

  // Bold title on the left, dates on the right of the same line.
  const titleLine = (left, right, size = 11) => {
    const rw = right ? regular.widthOfTextAtSize(pdfSafe(right), 9.5) : 0;
    wrap(left, bold, size, maxW - (rw ? rw + 14 : 0)).forEach((ln, i) => {
      ensure(size + 4.5);
      page.drawText(ln, { x: M, y: y - size, size, font: bold, color: ink });
      if (i === 0 && rw) page.drawText(pdfSafe(right), { x: W - M - rw, y: y - size + 0.5, size: 9.5, font: regular, color: muted });
      y -= size + 4.5;
    });
  };

  // "Frontend:" in bold, then the items in one column, wrapped under each other.
  const labelled = (label, text, indent) => {
    wrap(text, regular, 10.5, maxW - indent).forEach((ln, i) => {
      ensure(14.8);
      if (i === 0) page.drawText(`${pdfSafe(label)}:`, { x: M, y: y - 10.5, size: 10.5, font: bold, color: ink });
      page.drawText(ln, { x: M + indent, y: y - 10.5, size: 10.5, font: regular, color: ink });
      y -= 14.8;
    });
  };

  const bullet = (text) => {
    wrap(text, regular, 10.5, maxW - 14).forEach((ln, i) => {
      ensure(14.8);
      if (i === 0) page.drawCircle({ x: M + 4, y: y - 7, size: 1.7, color: accent });
      page.drawText(ln, { x: M + 14, y: y - 10.5, size: 10.5, font: regular, color: ink });
      y -= 14.8;
    });
  };

  const section = (title) => {
    ensure(44);
    y -= 12;
    page.drawText(title.toUpperCase(), { x: M, y: y - 10.5, size: 10.5, font: bold, color: accent });
    y -= 16;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: rule });
    y -= 9;
  };

  // Header
  write(p.name, { font: bold, size: 24, gap: 6 });
  if (p.headline) write(p.headline, { size: 13, color: accent, gap: 7 });
  const contact = [p.phone, p.email, p.location, p.linkedin].filter(Boolean).join("  |  ");
  if (contact) write(contact, { size: 9.8, color: muted });

  if (p.summary) {
    section("Professional Summary");
    write(p.summary, { gap: 4.6 });
  }

  if (p.strengths?.length) {
    section("Core Competencies");
    write(p.strengths.join("  |  "), { gap: 4.6 });
  }

  if (p.skills.length) {
    section("Skills");
    const groups = groupSkills(p.skills);
    if (groups.length === 1) write(p.skills.join(", "));
    else {
      const indent = Math.min(160, Math.max(...groups.map(([g]) => bold.widthOfTextAtSize(`${pdfSafe(g)}:`, 10.5))) + 10);
      groups.forEach(([g, items]) => labelled(g, items.join(", "), indent));
    }
  }

  if (p.experience.length) {
    section("Work Experience");
    p.experience.forEach((e, i) => {
      if (i) y -= 7;
      titleLine(e.role || e.company, e.period);
      if (e.role && e.company) write(e.company, { font: italic, size: 10.2, color: muted, gap: 5 });
      e.points.forEach(bullet);
    });
  }

  if (p.projects.length) {
    section("Projects");
    p.projects.forEach((e, i) => {
      if (i) y -= 7;
      titleLine(e.name, "");
      e.points.forEach(bullet);
    });
  }

  if (p.education.length) {
    section("Education");
    p.education.forEach((e, i) => {
      if (i) y -= 7;
      titleLine(e.degree || e.school, e.period);
      if (e.degree && e.school) write(e.school, { font: italic, size: 10.2, color: muted, gap: 4.5 });
      if (e.details) write(e.details, { size: 10, color: ink });
    });
  }

  if (p.certifications?.length) {
    section("Certifications");
    p.certifications.forEach(bullet);
  }
  if (p.achievements?.length) {
    section("Achievements");
    p.achievements.forEach(bullet);
  }
  if (p.languages?.length) {
    section("Languages");
    write(p.languages.join(", "));
  }
  if (p.extras.length) {
    section("Additional Information");
    p.extras.forEach(bullet);
  }

  return Buffer.from(await doc.save());
}
