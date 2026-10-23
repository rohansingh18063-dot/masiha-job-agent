import { publicUser } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { UserError } from "@/lib/gemini";
import { resolveRole } from "@/lib/roles";
import { profileFromAnswers } from "@/lib/templates";
import { saveProfile } from "@/lib/profile";
import { handle, ok, readBody } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

// Answers are text, or small forms: { field: text } or a list of them (education, jobs, projects).
function cleanValue(v, depth = 0) {
  if (Array.isArray(v)) return depth < 3 ? v.slice(0, 8).map((x) => cleanValue(x, depth + 1)) : [];
  if (v && typeof v === "object") {
    return depth < 3 ? Object.fromEntries(Object.entries(v).slice(0, 15).map(([k, x]) => [String(k).slice(0, 40), cleanValue(x, depth + 1)])) : {};
  }
  if (typeof v === "boolean") return v;
  return String(v ?? "").slice(0, 2000);
}

/** Chat answers -> resume in the fixed format, filled from the role library (no Gemini for known jobs). */
export const POST = handle(async (req) => {
  const { answers } = await readBody(req, 40000);
  if (!answers || typeof answers !== "object" || !String(answers.name || "").trim()) {
    throw new UserError("Please tell us your name first.");
  }
  const clean = Object.fromEntries(Object.entries(answers).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), cleanValue(v)]));
  const me = await requireUser();
  await limit(`build:${me.id}`, 10, 3600);
  const role = await resolveRole(me.id, clean.role);
  const user = await saveProfile(me.id, profileFromAnswers(clean, role));
  return ok(publicUser(user));
});
