import { updateUser, publicUser, contactFor } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { allCompanies } from "@/lib/companies";
import { UserError } from "@/lib/gemini";
import { countSiteSend } from "@/lib/usage";
import { checkCompanyAllowed, isPaid } from "@/lib/plans";
import { DAILY_SEND_LIMIT } from "@/lib/config";
import { handle, ok, readBody } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

/**
 * Two steps, because opening Gmail does not mean the email went out:
 * - { opened: true | false } notes that the user opened (or did not send) this email, so we can ask them later.
 * - {} records that the user confirmed they sent it. Only then does the company leave their list.
 */
export const POST = handle(async (req) => {
  const { companyId, opened } = await readBody(req);
  const me = await requireUser();
  await limit(`sent:${me.id}`, 300, 3600);
  const company = (await allCompanies()).find((c) => c.id === companyId);
  if (!company) throw new UserError("Company not found.", 404);

  if (typeof opened === "boolean") {
    await updateUser(me.id, (u) => {
      const draft = u.drafts[company.id];
      if (!draft) return;
      if (opened) draft.openedAt = new Date().toISOString();
      else delete draft.openedAt;
    });
    return ok({ ok: true });
  }

  checkCompanyAllowed(me, company); // free plan: their one city only
  const result = await updateUser(me.id, (u) => {
    if (contactFor(u, company)) return "done";
    if (u.usage.sends >= DAILY_SEND_LIMIT) return "limit";
    u.usage.sends += 1;
    // The first email fixes the free city, so the free plan cannot be moved around from city to city.
    if (u.freeCity && !u.freeCity.lockedAt && !isPaid(u)) u.freeCity.lockedAt = new Date().toISOString();
    u.contacts[company.id] = { sentAt: new Date().toISOString(), emails: company.emails.slice(0, 1), replied: false };
    delete u.drafts[company.id];
    return "ok";
  });
  if (result === "done") throw new UserError("You already emailed this HR team.", 409);
  if (result === "limit") throw new UserError(`You have reached today's limit of ${DAILY_SEND_LIMIT} emails. Come back tomorrow.`, 429);

  await countSiteSend();
  const fresh = await requireUser();
  return ok(publicUser(fresh));
});
