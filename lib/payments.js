import { query, tx } from "./db";
import { PLANS } from "./plans";
import { createOrder, fetchPayment, capturePayment } from "./razorpay";
import { UserError } from "./errors";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Starts a payment: creates a Razorpay order for this plan and remembers it. */
export async function startOrder(user, planId) {
  const plan = PLANS[planId];
  if (!plan) throw new UserError("Please choose a plan.");
  const order = await createOrder({
    amount: plan.amount,
    receipt: `${user.id.slice(0, 12)}-${Date.now().toString(36)}`,
    notes: { userId: user.id, plan: plan.id },
  });
  await query("INSERT INTO payments (order_id, user_id, plan, amount) VALUES ($1, $2, $3, $4)", [order.id, user.id, plan.id, plan.amount]);
  return { orderId: order.id, amount: plan.amount, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID, plan };
}

/**
 * Asks Razorpay itself about the payment (never trusting the browser), captures it if needed, and grants
 * the plan. Safe to call many times, from the page and from the webhook: an order gives days only once.
 * Returns the new plan end date, or null if this payment cannot count.
 */
export async function confirmPayment(orderId, paymentId) {
  const { rows } = await query("SELECT * FROM payments WHERE order_id = $1", [orderId]);
  const order = rows[0];
  if (!order) return null;
  if (order.status === "paid") return "already";

  let payment = await fetchPayment(paymentId);
  if (payment.order_id !== orderId || payment.amount !== order.amount || payment.currency !== order.currency) {
    console.error("Payment does not match its order", { orderId, paymentId });
    return null;
  }
  if (payment.status === "authorized") payment = await capturePayment(paymentId, order.amount);
  if (payment.status !== "captured") return null;

  return grant(orderId, paymentId);
}

/** Marks the order paid and adds the plan's days to the student, in one transaction (only once per order). */
async function grant(orderId, paymentId) {
  return tx(async (db) => {
    const { rows } = await db.query(
      "UPDATE payments SET status = 'paid', payment_id = $2, paid_at = now() WHERE order_id = $1 AND status <> 'paid' RETURNING user_id, plan",
      [orderId, paymentId],
    );
    if (!rows[0]) return "already";
    const plan = PLANS[rows[0].plan];
    const u = await db.query("SELECT data FROM users WHERE id = $1 FOR UPDATE", [rows[0].user_id]);
    if (!u.rows[0]) throw new Error(`Paid order ${orderId} has no user`);
    const user = u.rows[0].data;
    const from = Math.max(Date.now(), Date.parse(user.planUntil || 0) || 0);
    user.planUntil = new Date(from + plan.days * DAY_MS).toISOString();
    await db.query("UPDATE users SET data = $2::jsonb, updated_at = now() WHERE id = $1", [rows[0].user_id, JSON.stringify(user)]);
    return user.planUntil;
  });
}

/** For the admin dashboard. */
export async function paymentStats() {
  const { rows } = await query(
    `SELECT count(*) FILTER (WHERE status = 'paid')::int AS paid,
            COALESCE(sum(amount) FILTER (WHERE status = 'paid'), 0)::int AS total,
            COALESCE(sum(amount) FILTER (WHERE status = 'paid' AND paid_at >= date_trunc('day', now())), 0)::int AS today
       FROM payments`,
  );
  const active = await query("SELECT count(*)::int AS n FROM users WHERE (data->>'planUntil')::timestamptz > now()");
  return { ...rows[0], activePlans: active.rows[0].n };
}
