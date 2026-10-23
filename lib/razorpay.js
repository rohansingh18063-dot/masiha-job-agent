import crypto from "node:crypto";

/*
 * Razorpay (Orders API + Standard Checkout). Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * (Dashboard → Account & Settings → API Keys) and, for the webhook, RAZORPAY_WEBHOOK_SECRET.
 * Test keys start with rzp_test_ and take no real money.
 */
const API = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1"; // override only for automated tests

function auth() {
  return `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: auth(), "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${method} ${path} failed: ${res.status} ${data?.error?.description || ""}`);
  return data;
}

export const createOrder = ({ amount, receipt, notes }) => call("POST", "/orders", { amount, currency: "INR", receipt, notes });
export const fetchPayment = (id) => call("GET", `/payments/${encodeURIComponent(id)}`);
export const capturePayment = (id, amount) => call("POST", `/payments/${encodeURIComponent(id)}/capture`, { amount, currency: "INR" });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** The checkout's success callback is real only if this signature matches (proves it came from Razorpay). */
export function checkoutSignatureOk(orderId, paymentId, signature) {
  const want = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(want, signature);
}

/** A webhook is real only if its signature matches the raw body and the webhook secret. */
export function webhookSignatureOk(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
