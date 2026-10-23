"use client";

import { useState } from "react";
import { api, Icon } from "./ui";

/** Loads Razorpay's checkout script once, when someone first presses a pay button. */
let checkoutScript = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ||= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://checkout.razorpay.com/v1/checkout.js";
    tag.async = true;
    tag.onload = resolve;
    tag.onerror = () => {
      checkoutScript = null;
      reject(new Error("Could not open the payment window. Please check your internet and try again."));
    };
    document.head.appendChild(tag);
  });
  return checkoutScript;
}

const dateText = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Plan box: what the student has now, and buttons to buy 10 or 30 days.
 * The server makes the order and checks the payment with Razorpay before any days are added.
 */
export default function Plans({ me, setMe, compact = false, reason = "" }) {
  const plan = me.plan;
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  if (!plan?.paymentsOn) return null;

  async function buy(planId) {
    setMsg(null);
    setBusy(planId);
    try {
      const order = await api("/api/pay/order", { method: "POST", body: { plan: planId } });
      await loadCheckout();
      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "Masiha Job Agent",
          description: `All cities for ${order.plan.label}`,
          prefill: order.prefill,
          theme: { color: "#6D4AFF" },
          handler: async (r) => {
            try {
              const d = await api("/api/pay/verify", {
                method: "POST",
                body: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature },
              });
              setMe(d);
              setMsg({ type: "ok", text: `Payment done. Every city and state is open until ${dateText(d.plan.until)}.` });
            } catch (err) {
              setMsg({ type: "err", text: err.message });
            }
            resolve();
          },
          modal: { ondismiss: resolve },
        });
        rzp.on("payment.failed", (e) => setMsg({ type: "err", text: e?.error?.description || "The payment did not go through. No money was taken." }));
        rzp.open();
      });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={`plans${compact ? " compact" : ""}`}>
      {plan.paid ? (
        <p className="plan-now ok"><Icon name="check" size={16} /> <span><b>All cities and states</b> until {dateText(plan.until)}.</span></p>
      ) : (
        <p className="plan-now">
          <span>
            <b>Free plan:</b> companies in one city{plan.freeCity ? <> (<b>{plan.freeCity.city}</b>{plan.freeCity.locked ? "" : ", you can still change it until your first email"})</> : ""}.
            {reason ? <> {reason}</> : null}
          </span>
        </p>
      )}
      <div className="plan-row">
        {plan.plans.map((p) => (
          <button key={p.id} className={`plan-card${p.days === 30 ? " best" : ""}`} onClick={() => buy(p.id)} disabled={Boolean(busy)}>
            {p.days === 30 && <span className="plan-tag">Best value</span>}
            <b>{p.price}</b>
            <span>{plan.paid ? `Add ${p.label}` : `${p.label}, every city`}</span>
            {busy === p.id && <span className="spin dark" />}
          </button>
        ))}
      </div>
      <small className="hint">Pay safely with UPI, card or net banking through Razorpay. One-time payment, no auto-renewal.</small>
      {msg && <p className={`alert ${msg.type}`} style={{ margin: 0 }}>{msg.text}</p>}
    </div>
  );
}
