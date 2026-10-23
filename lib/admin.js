import crypto from "node:crypto";
import { cookies } from "next/headers";
import { UserError } from "./gemini";

const COOKIE = "mja_admin";
const TTL_MS = 12 * 60 * 60 * 1000;

function sign(value) {
  const secret = process.env.ADMIN_PASSWORD || "";
  return crypto.createHmac("sha256", `masiha-admin:${secret}`).update(value).digest("hex");
}

const MIN_ADMIN_PASSWORD = 12;

/** Why the admin password cannot be used yet, or "" if it is fine. */
export function adminPasswordProblem() {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) return "Set ADMIN_PASSWORD in the .env file first.";
  if (real.length < MIN_ADMIN_PASSWORD) return `ADMIN_PASSWORD is too short. Use at least ${MIN_ADMIN_PASSWORD} characters (20 or more is best).`;
  return "";
}

export function passwordMatches(given) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (adminPasswordProblem()) return false;
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const value = String(Date.now());
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_MS / 1000,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

/** True when the admin is logged in (never throws). */
export async function isAdmin() {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  const problem = adminPasswordProblem();
  if (problem) throw new UserError(problem, 503);
  const raw = (await cookies()).get(COOKIE)?.value || "";
  const [value, mac] = raw.split(".");
  const valid = value && mac && mac.length === 64 &&
    crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(sign(value), "hex")) &&
    Date.now() - Number(value) < TTL_MS;
  if (!valid) throw new UserError("Please log in.", 401);
}
