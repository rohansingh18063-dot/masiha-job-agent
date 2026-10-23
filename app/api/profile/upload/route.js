import { after } from "next/server";
import { publicUser, updateUser } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { askGeminiJson, UserError } from "@/lib/gemini";
import { UPLOAD_PROMPT, normalizeProfile } from "@/lib/resume";
import { saveProfile, PDF, DOCX } from "@/lib/profile";
import { resumeText, quickProfile } from "@/lib/quickread";
import { titleCase } from "@/lib/roles";
import { randomId } from "@/lib/store";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import { handle, ok, clientIp } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

/*
 * The student's own file becomes their resume, exactly as uploaded.
 * 1. Right away (no AI): read the text, pick out name, contact, job title and skills, save, and answer.
 * 2. Then, in the background: Gemini reads the same text for jobs and education and fills them in.
 *    The companies page checks back and shows them when ready.
 */
export const POST = handle(async (req) => {
  // Who it is comes first, so nobody can make the server read files without an account.
  const me = await requireUser();
  await limit(`upload:${me.id}`, 10, 3600, "You have uploaded a lot of files this hour. Please try again later.");
  await limit(`upload-ip:${clientIp(req)}`, 30, 3600, "Too many uploads from here. Please try again later.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new UserError("Please choose a PDF or Word file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UserError("Please upload a file under 5 MB.");

  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const isPdf = buf.subarray(0, 5).toString() === "%PDF-";
  const isDocx = !isPdf && (name.endsWith(".docx") || file.type === DOCX);
  if (!isPdf && !isDocx) throw new UserError("Please upload a PDF or a Word (.docx) file.");

  const text = await resumeText(buf, isPdf);
  if (isDocx && text.trim().length < 50) throw new UserError("We could not read that Word file. Please try a PDF.");

  const quick = await quickProfile(text);
  if (!quick.name) quick.name = titleCase(String(me.username || "").replace(/[._]+/g, " ")) || "Your Name";
  // UPLOAD_AI=off: uploads use no Gemini at all (no job and education details, just the quick read).
  const useAi = process.env.UPLOAD_AI !== "off";
  const readId = randomId(6);
  const user = await saveProfile(
    me.id,
    { ...quick, source: "upload", readId, reading: useAi, readAt: new Date().toISOString() },
    { file: { bytes: buf, mime: isPdf ? PDF : DOCX } },
  );
  if (!useAi) return ok(publicUser(user));

  // Text is much quicker for Gemini than a whole PDF. Scanned PDFs have no text, so those are sent as they are.
  const parts = text.trim().length >= 200
    ? [{ text: `${UPLOAD_PROMPT}\n\nRESUME TEXT:\n${text.slice(0, 30000)}` }]
    : [{ inline_data: { mime_type: PDF, data: buf.toString("base64") } }, { text: UPLOAD_PROMPT }];
  after(() => fillDetails(me.id, readId, parts));

  return ok(publicUser(user));
});

/** Adds what Gemini read (jobs, education, and anything the quick read missed) to the saved profile. */
async function fillDetails(userId, readId, parts) {
  let found = null;
  try {
    const raw = await askGeminiJson(userId, parts, () => ({ experience: [{ role: "Sample Role", company: "Sample Company", period: "2024" }] }), { fast: true, timeoutMs: 45000 });
    found = normalizeProfile({ name: "-", ...raw });
  } catch (err) {
    if (!(err instanceof UserError)) console.error("Background resume read failed", err);
  }
  await updateUser(userId, (u) => {
    // Skip if the student uploaded again or changed their details meanwhile.
    if (u.profile?.readId !== readId) return;
    const p = u.profile;
    if (found) {
      for (const k of ["email", "phone", "linkedin", "location", "headline"]) if (!p[k] && found[k]) p[k] = found[k];
      if (found.name && found.name !== "-" && p.name === titleCase(String(u.username || "").replace(/[._]+/g, " "))) p.name = found.name;
      if (found.skills.length) p.skills = found.skills; // Gemini copies the skills exactly as listed
      p.experience = found.experience;
      p.education = found.education;
      if (!u.prefs.targetRole && p.headline) u.prefs.targetRole = p.headline;
    }
    p.reading = false;
  });
}
