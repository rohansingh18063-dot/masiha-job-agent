import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleEnabled, identityFromCode } from "@/lib/google";
import { loginWithGoogle } from "@/lib/auth";
import { originOf, clientIp } from "@/lib/http";
import { UserError } from "@/lib/errors";

const ATTEMPT_COOKIE = "mja_google";

const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google sends the student back here. Checks the one-time state, logs them in, and goes home. */
export async function GET(req) {
  const origin = originOf(req);
  const back = (path) => NextResponse.redirect(new URL(path, origin));
  const url = new URL(req.url);
  const jar = await cookies();
  const [state = "", verifier = ""] = (jar.get(ATTEMPT_COOKIE)?.value || "").split(".");
  jar.delete({ name: ATTEMPT_COOKIE, path: "/api/auth/google" });

  if (!googleEnabled()) return back("/login?error=google_off");
  if (url.searchParams.get("error")) return back("/login?error=google_cancelled"); // e.g. they pressed Cancel
  const code = url.searchParams.get("code") || "";
  const returned = url.searchParams.get("state") || "";
  if (!code || !state || !verifier || !same(state, returned)) return back("/login?error=google_expired");

  try {
    await loginWithGoogle(await identityFromCode(origin, code, verifier), clientIp(req));
  } catch (err) {
    if (err instanceof UserError) return back(`/login?error=google_limit`);
    console.error("Google sign-in failed", err);
    return back("/login?error=google_failed");
  }
  return back("/");
}
