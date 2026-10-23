import { Header } from "../_components/ui";
import { HUB_URL } from "@/lib/config";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Contact · Masiha Job Agent" };

export default function ContactPage() {
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="wrap legal">
        <h1 className="h">Contact us</h1>
        <p className="muted">Questions about your account, a payment or a refund? We usually reply within one working day.</p>
        <ul>
          <li><b>Business:</b> {BUSINESS.name}</li>
          {BUSINESS.email && <li><b>Email:</b> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>}
          {BUSINESS.phone && <li><b>Phone:</b> {BUSINESS.phone}</li>}
          {BUSINESS.address && <li><b>Address:</b> {BUSINESS.address}</li>}
        </ul>
        <p className="muted">For a payment, please include your username and the payment ID from your Razorpay receipt.</p>
      </main>
    </>
  );
}
