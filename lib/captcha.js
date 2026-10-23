import { UserError } from "./errors";

/*
 * Optional "I am human" check on sign-up (Cloudflare Turnstile, free). It stops scripts from making
 * hundreds of accounts to use up the AI quota. Turned on when both keys are set:
 *   TURNSTILE_SITE_KEY (shown in the page) and TURNSTILE_SECRET_KEY (server only).
 */
export const captchaSiteKey = () => (process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY) || "";

export async function checkCaptcha(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.TURNSTILE_SITE_KEY) return; // not set up
  if (!token || typeof token !== "string" || token.length > 2048) throw new UserError("Please complete the “I am human” check.", 400);
  let ok = false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip && ip !== "direct" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    ok = (await res.json()).success === true;
  } catch (err) {
    console.error("Captcha check failed", err);
    throw new UserError("We could not check that you are human. Please try again.", 503);
  }
  if (!ok) throw new UserError("The “I am human” check did not pass. Please try it again.", 400);
}
