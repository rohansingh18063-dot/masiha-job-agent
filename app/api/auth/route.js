import { signup, login, logout } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";

/** Student sign up, log in and log out. */
export const POST = handle(async (req) => {
  const body = await readBody(req, 8000); // room for the "I am human" token
  if (body.action === "signup") await signup(req, body);
  else if (body.action === "login") await login(req, body);
  else if (body.action === "logout") await logout();
  else throw new UserError("Unknown action.");
  return ok({ ok: true });
});
