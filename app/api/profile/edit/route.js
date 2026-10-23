import { publicUser } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { askGeminiJson, UserError } from "@/lib/gemini";
import { editPrompt } from "@/lib/resume";
import { saveProfile } from "@/lib/profile";
import { handle, ok, readBody } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

export const POST = handle(async (req) => {
  const { instruction } = await readBody(req);
  const text = String(instruction || "").trim();
  if (text.length < 3) throw new UserError("Tell us what to change, e.g. \"Add Python to my skills\".");
  if (text.length > 1000) throw new UserError("Please keep the change request shorter.");

  const me = await requireUser();
  await limit(`edit:${me.id}`, 20, 3600); // uses Gemini
  if (!me.profile) throw new UserError("Please create your profile first.");
  const raw = await askGeminiJson(me.id, [{ text: editPrompt(me.profile, text) }], () => {
    const p = structuredClone(me.profile);
    const m = text.match(/add (.+?) to (?:my )?skills/i);
    if (m) p.skills.push(m[1]);
    return p;
  });
  // An uploaded resume file is never rewritten: only the details used in emails change.
  const uploaded = me.profile.source === "upload";
  const user = await saveProfile(me.id, { ...raw, source: me.profile.source }, { keepFile: uploaded });
  return ok(publicUser(user));
});
