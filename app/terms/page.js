import { Header } from "../_components/ui";
import { HUB_URL } from "@/lib/config";
import { PLANS } from "@/lib/plans";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Terms of use · Masiha Job Agent" };

export default function TermsPage() {
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="wrap legal">
        <h1 className="h">Terms of use</h1>
        <p className="muted">These terms apply when you use Masiha Job Agent, run by {BUSINESS.name}. Last updated 23 October 2026.</p>

        <h2>The service</h2>
        <ul>
          <li>We help you make a resume and write a personal email to company HR teams. You send each email yourself, from your own Gmail.</li>
          <li>We do not promise a job, an interview or a reply. Company details come from public sources and may change.</li>
        </ul>

        <h2>Plans and payment</h2>
        <ul>
          <li>Free: companies in one city. You can change that city until you send your first email.</li>
          <li>{PLANS.days10.price} for {PLANS.days10.label} or {PLANS.days30.price} for {PLANS.days30.label}: companies in every city and state. The time starts when the payment is confirmed. Buying again adds the days on top.</li>
          <li>Prices include all charges. Payments are handled by Razorpay. It is a one-time payment, with no auto-renewal.</li>
          <li>Refunds are explained on the <a href="/refunds">refund policy</a> page.</li>
        </ul>

        <h2>Using it fairly</h2>
        <ul>
          <li>Use only true information about yourself. Email companies only about jobs, politely, and never send spam.</li>
          <li>Do not copy the company list, try to break into the site, or share your account. We may close accounts that do.</li>
          <li>You can delete your account at any time. How we handle your information is in our <a href="/privacy">privacy policy</a>.</li>
        </ul>

        <p className="muted">Questions? See the <a href="/contact">contact page</a>.</p>
      </main>
    </>
  );
}
