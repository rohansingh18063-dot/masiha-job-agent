import { requireAdmin } from "@/lib/admin";
import { allCompanies, deleteCompany, matchesQuery } from "@/lib/companies";
import { contactCounts } from "@/lib/users";
import { UserError } from "@/lib/gemini";
import { handle, ok, readBody } from "@/lib/http";

const PAGE_SIZE = 50;

/** Admin: search every stored company with all its columns. */
export const GET = handle(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").slice(0, 100);
  const state = url.searchParams.get("state") || "";
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);

  const list = await allCompanies();
  const hits = list
    .filter((c) => (!state || c.state === state) && matchesQuery(c, q))
    .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  const counts = await contactCounts();

  return ok({
    total: hits.length,
    page,
    pages: Math.max(1, Math.ceil(hits.length / PAGE_SIZE)),
    rows: hits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((c) => ({ ...c, emailedBy: counts[c.id] || 0 })),
  });
});

export const POST = handle(async (req) => {
  await requireAdmin();
  const { action, id } = await readBody(req);
  if (action !== "delete" || typeof id !== "string") throw new UserError("Unknown action.");
  if (!(await deleteCompany(id))) throw new UserError("Company not found.", 404);
  return ok({ ok: true });
});
