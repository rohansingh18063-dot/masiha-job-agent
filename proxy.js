import { NextResponse } from "next/server";

/*
 * Content Security Policy for every page: the browser runs only our own scripts (each page gets a fresh
 * one-time nonce), so even if someone managed to put HTML into a page, their script would not run.
 * Outside scripts allowed: Cloudflare Turnstile ("I am human" check) and Razorpay checkout (payments).
 */
export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://checkout.razorpay.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // React style={{…}} attributes; styles cannot run code
    "img-src 'self' blob: data: https://*.razorpay.com",
    "font-src 'self'",
    "connect-src 'self' https://*.razorpay.com",
    "frame-src https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|r/|_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
