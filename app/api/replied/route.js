import { updateUser } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { UserError } from "@/lib/gemini";
import { handle, ok, readBody } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

/** The user marks that a company replied; it then stays hidden for good. */
export const POST = handle(async (req) => {
  const { companyId, replied } = await readBody(req);
  const me = await requireUser();
  await limit(`replied:${me.id}`, 300, 3600);
  if (!me.contacts[companyId]) throw new UserError("You have not emailed this company yet.", 404);
  await updateUser(me.id, (u) => { u.contacts[companyId].replied = replied !== false; });
  return ok({ ok: true });
});
