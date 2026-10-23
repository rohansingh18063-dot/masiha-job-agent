import { Header } from "../_components/ui";
import { HUB_URL } from "@/lib/config";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Refund and cancellation policy · Masiha Job Agent" };

export default function RefundsPage() {
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="wrap legal">
        <h1 className="h">Refund and cancellation policy</h1>
        <p className="muted">Last updated 23 October 2026.</p>

        <h2>Cancellation</h2>
        <ul>
          <li>Plans are one-time payments for 10 or 30 days. They do not renew, so there is nothing to cancel.</li>
        </ul>

        <h2>Refunds</h2>
        <ul>
          <li><b>Money taken but plan not added:</b> if your payment went through but every city did not open within 30 minutes, contact us. We add the plan or refund you in full.</li>
          <li><b>Charged twice:</b> we refund the extra payment in full.</li>
          <li><b>Within 24 hours, before your first email:</b> if you paid by mistake and have not sent any email with the paid plan, you can ask for a full refund.</li>
          <li>After that, payments are not refundable, because the service is used straight away.</li>
          <li>Approved refunds go back to the same card, UPI or bank account through Razorpay, usually within 5 to 7 working days.</li>
        </ul>

        <h2>How to ask</h2>
        <p>
          {BUSINESS.email ? <>Write to <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></> : <>Use the <a href="/contact">contact page</a></>} with your
          username and the payment ID from your Razorpay receipt (it starts with <code>pay_</code>).
        </p>
      </main>
    </>
  );
}
