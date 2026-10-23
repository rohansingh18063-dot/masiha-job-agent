import { requireUser } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { GENERAL_STRENGTHS } from "@/lib/roles-details";
import { handle, ok } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

/** Suggestions for the chat builder: typical skills, strengths and work points for the job the student picked. */
export const GET = handle(async (req) => {
  const me = await requireUser();
  await limit(`role:${me.id}`, 30, 3600); // can ask Gemini about a new job
  const text = (new URL(req.url).searchParams.get("title") || "").slice(0, 80);
  const { pack, title } = await resolveRole(me.id, text);
  const strengths = [...(pack.strengths || []), ...GENERAL_STRENGTHS.filter((s) => !(pack.strengths || []).includes(s))];
  return ok({ title, skills: pack.skills || [], strengths, bullets: pack.bullets || [] });
});
