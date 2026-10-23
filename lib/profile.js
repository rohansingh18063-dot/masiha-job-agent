import { normalizeProfile, renderResumePdf } from "./resume";
import { loadUser, updateUser } from "./users";
import { query } from "./db";
import { UserError } from "./gemini";

export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** The resume file behind a public /r/<token> link ({ bytes, mime }), or null. */
export async function getResumeFile(token) {
  const { rows } = await query("SELECT pdf, mime FROM resume_files WHERE token = $1", [token]);
  return rows[0] ? { bytes: rows[0].pdf, mime: rows[0].mime || PDF } : null;
}

async function putResumeFile(token, bytes, mime) {
  await query(
    `INSERT INTO resume_files (token, pdf, mime) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET pdf = EXCLUDED.pdf, mime = EXCLUDED.mime, updated_at = now()`,
    [token, bytes, mime],
  );
}

/**
 * Cleans the profile and saves it with the resume file everyone downloads:
 * - file:     the student's own upload, kept exactly as it is (PDF or Word);
 * - keepFile: leave the current file alone (changing details of an uploaded resume);
 * - neither:  make our PDF from the profile (chat-built resumes).
 */
export async function saveProfile(userId, raw, { file, keepFile = false } = {}) {
  let profile;
  try {
    profile = normalizeProfile(raw);
  } catch {
    throw new UserError("We could not read a name in that resume. Please check it and try again.", 422);
  }
  // Save the file first: if that fails, the old profile and file stay as they were.
  if (file || !keepFile) {
    const token = (await loadUser(userId))?.resumeToken;
    if (token) await putResumeFile(token, file ? file.bytes : await renderResumePdf(profile), file ? file.mime : PDF);
  }
  const user = await updateUser(userId, (u) => {
    u.profile = profile;
    if (!keepFile) {
      u.resumeVersion = (u.resumeVersion || 0) + 1;
      u.resumeType = file?.mime === DOCX ? "docx" : "pdf";
    }
    u.drafts = {}; // old drafts used the old details
    if (!u.prefs.targetRole) u.prefs.targetRole = profile.headline;
  });
  return user;
}
