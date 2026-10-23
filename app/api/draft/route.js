import { updateUser, contactFor } from "@/lib/users";
import { requireUser } from "@/lib/auth";
import { allCompanies } from "@/lib/companies";
import { UserError } from "@/lib/gemini";
import { templateDraft, normalizeDraft, cleanDraft } from "@/lib/email";
import { resolveRole } from "@/lib/roles";
import { canonicalCity } from "@/lib/cities";
import { checkCompanyAllowed } from "@/lib/plans";
import { emailFromRole, variantFor, EMAIL_VARIANTS } from "@/lib/templates";
import { handle, ok, readBody } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

/**
 * Writes the email from the role library, so it costs no Gemini call.
 * Gemini is used only once per new job title (see lib/roles.js). "Rewrite" moves to the next wording.
 */
export const POST = handle(async (req) => {
  const { companyId, regenerate } = await readBody(req);
  const me = await requireUser();
  await limit(`draft:${me.id}`, 200, 3600);
  if (!me.profile) throw new UserError("Please create your profile first.");

  const found = (await allCompanies()).find((c) => c.id === companyId);
  if (!found) throw new UserError("Company not found.", 404);
  const company = { ...found, city: canonicalCity(found.state, found.city) }; // "bhopal" -> "Bhopal" in the email
  checkCompanyAllowed(me, company); // free plan: their one city only
  if (contactFor(me, company)) throw new UserError("You already emailed this HR team.");
  const prev = me.drafts[company.id];
  if (prev && !regenerate) return ok({ draft: cleanDraft(prev) });

  const role = await resolveRole(me.id, me.prefs.targetRole || me.profile.headline);
  const variant = regenerate && Number.isInteger(prev?.variant) ? (prev.variant + 1) % EMAIL_VARIANTS : variantFor(company.id);

  let draft;
  try {
    draft = normalizeDraft(role.title ? emailFromRole(role, me.profile, company, variant) : templateDraft(me.profile, company, ""));
  } catch {
    draft = normalizeDraft(templateDraft(me.profile, company, role.title));
  }
  draft.variant = variant;
  draft.createdAt = new Date().toISOString();
  await updateUser(me.id, (u) => { u.drafts[company.id] = draft; });
  return ok({ draft });
});
