import { updateUser, publicUser, deleteUserData } from "@/lib/users";
import { requireUser, logout } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { INDIA_STATES } from "@/lib/config";
import { handle, ok, readBody } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  return ok(publicUser(user));
});

export const PATCH = handle(async (req) => {
  const body = await readBody(req);
  const me = await requireUser();
  const user = await updateUser(me.id, (u) => {
    if (typeof body.targetRole === "string") u.prefs.targetRole = body.targetRole.trim().slice(0, 80);
    if (typeof body.state === "string") u.prefs.state = INDIA_STATES.includes(body.state) ? body.state : "";
    if (typeof body.city === "string") u.prefs.city = body.city.trim().slice(0, 60);
  });
  return ok(publicUser(user));
});

/** "Delete my account": the student types DELETE to confirm. Everything about them is removed. */
export const DELETE = handle(async (req) => {
  const { confirm } = await readBody(req);
  const me = await requireUser();
  if (confirm !== "DELETE") throw new UserError("Please type DELETE to confirm.");
  await deleteUserData(me.id);
  await logout();
  return ok({ ok: true });
});
