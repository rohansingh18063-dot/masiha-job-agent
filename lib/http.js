import { NextResponse } from "next/server";
import { UserError } from "./gemini";

export function ok(data) {
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

/** Wraps a route handler so thrown UserErrors become clean JSON errors. */
export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof UserError) return fail(err.message, err.status);
      console.error(err);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}

export async function readBody(req, max = 100000) {
  // Plain HTML forms on other websites cannot send JSON, so this also blocks cross-site requests.
  if (!(req.headers.get("content-type") || "").includes("application/json")) throw new UserError("Invalid request.", 415);
  const text = await req.text();
  if (text.length > max) throw new UserError("That is too long.", 413);
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new UserError("Invalid request.");
  }
}

/**
 * The visitor's IP address, for rate limits. The first X-Forwarded-For entry is whatever the visitor
 * typed, so it can be faked. Each proxy in front of the app adds the address it saw to the END, so we
 * count back TRUST_PROXY_HOPS entries (default 1: one proxy, as on Hostinger). Set it to 0 if the app
 * is not behind a proxy.
 */
export function clientIp(req) {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  const list = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops > 0 && list.length) return list[Math.max(0, list.length - hops)];
  return "direct";
}

export function originOf(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return `${proto}://${host}`;
}
