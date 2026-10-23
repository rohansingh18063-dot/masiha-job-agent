import { webhookSignatureOk } from "@/lib/razorpay";
import { confirmPayment } from "@/lib/payments";

/**
 * Razorpay calls this after a payment, even if the student closed the page before we could confirm it.
 * Set it up in Dashboard → Webhooks: URL <your site>/api/pay/webhook, events payment.captured and
 * order.paid, and the same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req) {
  const raw = await req.text();
  if (raw.length > 100000 || !webhookSignatureOk(raw, req.headers.get("x-razorpay-signature"))) {
    return new Response("bad signature", { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad body", { status: 400 });
  }
  const payment = event?.payload?.payment?.entity;
  if (["payment.captured", "order.paid"].includes(event?.event) && payment?.id && payment?.order_id) {
    try {
      await confirmPayment(payment.order_id, payment.id);
    } catch (err) {
      console.error("Webhook could not confirm payment", err);
      return new Response("try again", { status: 500 }); // Razorpay retries later
    }
  }
  return new Response("ok");
}
