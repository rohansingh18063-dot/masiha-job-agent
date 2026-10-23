import { contactFor, updateUser } from "@/lib/users";
import { planInfo, freeArea } from "@/lib/plans";
import { requireUser } from "@/lib/auth";
import { allCompanies, matchesQuery, byTrust } from "@/lib/companies";
import { cleanDraft } from "@/lib/email";
import { canonicalCity } from "@/lib/cities";
import { handle, ok } from "@/lib/http";
import { UserError } from "@/lib/errors";
import { limit } from "@/lib/ratelimit";

const PAGE_SIZE = 25;

// Students see 5 details: company, city, website, HR email and trust. Everything else stays in admin.
const pub = (c) => ({
  id: c.id, name: c.name, city: canonicalCity(c.state, c.city), state: c.state, website: c.website,
  hrEmail: c.emails[0], guessed: Boolean(c.guessed), trust: c.trust ?? null, trustText: c.trustText || "",
});

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") || "";
  const city = url.searchParams.get("city") || "";
  const q = (url.searchParams.get("q") || "").slice(0, 100);
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const me = await requireUser();
  if (!me.profile) throw new UserError("Please make your profile first.", 403);
  await limit(`companies:${me.id}`, 60, 60); // per minute
  await limit(`companies-day:${me.id}`, 600, 24 * 3600, "You have looked at a lot of company lists today. Please come back tomorrow.");
  const list = await allCompanies();
  const statesWithData = [...new Set(list.map((c) => c.state))];
  const countsIn = (st) => {
    const counts = {};
    if (st) for (const c of list) if (c.state === st) { const n = canonicalCity(c.state, c.city); counts[n] = (counts[n] || 0) + 1; }
    return counts;
  };

  // Free plan: one city. This is checked here on the server, so it cannot be skipped from the browser.
  let area = state ? { state, city } : null;
  let limitedTo = null;
  if (planInfo(me).limited) {
    const free = freeArea(me, state, city);
    if (free.pick) {
      return ok({ needCity: true, cityCounts: countsIn(state), statesWithData, open: [], openTotal: 0, page: 0, hasMore: false, contacted: [], contactedTotal: 0 });
    }
    if (free.set) await updateUser(me.id, (u) => { u.freeCity = { state: free.set.state, city: free.set.city, lockedAt: null }; });
    area = free.area;
    limitedTo = free.area;
  }

  const inState = area?.state ? list.filter((c) => c.state === area.state) : list;
  // City names are compared tidied, so "bhopal", "Bhopal" and old names like "Bombay" all match.
  const want = area?.city ? canonicalCity(area.state, area.city) : "";
  const cityCounts = countsIn(state || area?.state);
  const pick = inState.filter((c) => (!want || canonicalCity(c.state, c.city) === want) && matchesQuery(c, q));

  const open = [];
  const contacted = [];
  for (const c of pick) {
    const contact = contactFor(me, c);
    if (contact) contacted.push({ ...pub(c), sentAt: contact.sentAt, replied: Boolean(contact.replied), sameHr: Boolean(contact.sameHr) });
    else open.push(c);
  }
  open.sort(byTrust);
  contacted.sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  const slice = open.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((c) => ({ ...pub(c), draft: cleanDraft(me.drafts[c.id]) }));
  return ok({
    cityCounts, statesWithData, limitedTo,
    open: slice, openTotal: open.length, page, hasMore: (page + 1) * PAGE_SIZE < open.length,
    contacted: contacted.slice(0, 300), contactedTotal: contacted.length,
  });
});
