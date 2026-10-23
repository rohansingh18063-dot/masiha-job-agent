import { requireUser } from "@/lib/auth";
import { publicUser, loadUser } from "@/lib/users";
import { checkoutSignatureOk } from "@/lib/razorpay";
import { confirmPayment } from "@/lib/payments";
import { query } from "@/lib/db";
import { limit } from "@/lib/ratelimit";
import { UserError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";

/**
 * Step 2 of paying: the checkout says it worked. We check Razorpay's signature, then ask Razorpay
 * directly that the money really arrived for this order and amount, and only then add the days.
 */
export const POST = handle(async (req) => {
  const { orderId, paymentId, signature } = await readBody(req);
  const me = await requireUser();
  await limit(`pay-verify:${me.id}`, 30, 3600);
  if (![orderId, paymentId, signature].every((v) => typeof v === "string" && v.length > 5 && v.length < 200)) {
    throw new UserError("Payment details are missing.");
  }
  const { rows } = await query("SELECT user_id FROM payments WHERE order_id = $1", [orderId]);
  if (rows[0]?.user_id !== me.id) throw new UserError("This payment is not yours.", 403);
  if (!checkoutSignatureOk(orderId, paymentId, signature)) throw new UserError("We could not confirm this payment. If money was taken, it will be refunded automatically.", 400);

  const result = await confirmPayment(orderId, paymentId);
  if (!result) throw new UserError("Your payment is not complete yet. If money was taken, it will show up within a few minutes or be refunded.", 402);
  return ok(publicUser(await loadUser(me.id)));
});
