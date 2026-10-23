import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleEnabled, newAttempt, authUrl } from "@/lib/google";
import { originOf } from "@/lib/http";

const ATTEMPT_COOKIE = "mja_google"; // read back in ./callback/route.js

/** "Continue with Google": remembers a one-time state, then sends the browser to Google. */
export async function GET(req) {
  const origin = originOf(req);
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google_off", origin));
  const attempt = newAttempt();
  (await cookies()).set(ATTEMPT_COOKIE, `${attempt.state}.${attempt.verifier}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600,
  });
  return NextResponse.redirect(authUrl(origin, attempt));
}
