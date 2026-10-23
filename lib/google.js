import crypto from "node:crypto";

/*
 * "Continue with Google" (OpenID Connect, authorization code flow with PKCE). No extra packages.
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud → APIs & Services → Credentials),
 * with <your site>/api/auth/google/callback as an authorised redirect URI.
 */

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const callbackUrl = (origin) => `${origin}/api/auth/google/callback`;

/** A fresh state (stops forged logins) and PKCE pair (stops stolen codes being used). */
export function newAttempt() {
  const state = b64url(crypto.randomBytes(24));
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { state, verifier, challenge };
}

export function authUrl(origin, { state, challenge }) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/**
 * Swaps the one-time code for the user's Google identity. The ID token comes straight from Google's
 * token endpoint over HTTPS with our client secret, so (per OpenID Connect) its claims are checked
 * here without verifying the signature separately.
 */
export async function identityFromCode(origin, code, verifier) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const { id_token: idToken } = await res.json();
  const claims = JSON.parse(Buffer.from(String(idToken).split(".")[1] || "", "base64url").toString("utf8"));

  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw new Error("Wrong token issuer");
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Token is for another app");
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error("Token expired");
  if (!claims.sub) throw new Error("No Google account id");
  if (claims.email && claims.email_verified === false) throw new Error("Google email is not verified");
  return { sub: String(claims.sub), email: String(claims.email || ""), name: String(claims.name || "") };
}
