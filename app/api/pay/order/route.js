import { requireUser } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/plans";
import { startOrder } from "@/lib/payments";
import { limit } from "@/lib/ratelimit";
import { UserError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";

/** Step 1 of paying: makes a Razorpay order on the server (the price never comes from the browser). */
export const POST = handle(async (req) => {
  const { plan } = await readBody(req);
  const me = await requireUser();
  if (!paymentsEnabled()) throw new UserError("Payments are not set up yet.", 503);
  await limit(`pay-order:${me.id}`, 20, 3600);
  const order = await startOrder(me, plan);
  return ok({
    ...order,
    prefill: { name: me.profile?.name || "", email: me.profile?.email || me.email || "", contact: me.profile?.phone || "" },
  });
});
