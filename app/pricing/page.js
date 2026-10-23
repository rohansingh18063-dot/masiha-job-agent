import { Header, Icon } from "../_components/ui";
import PricingClient from "../_components/PricingClient";
import { currentUser } from "@/lib/auth";
import { PLANS, paymentsEnabled } from "@/lib/plans";
import { HUB_URL } from "@/lib/config";

export const metadata = {
  title: "Pricing · Masiha Job Agent",
  description: "Free for one city. Every city and state for ₹99 for 10 days or ₹199 for 30 days. One-time payment, no auto-renewal.",
};

const perDay = (plan) => `about ₹${Math.ceil(plan.amount / 100 / plan.days)} a day`;

// Written from the student's side: what each plan does for their job search.
const CARDS = [
  {
    name: "Free",
    price: "₹0",
    note: "for as long as you like",
    fit: "You want a job in your own city.",
    lines: ["Every company in one city", "Personal email for each company", "Your resume attached, from your own Gmail", "Up to 20 emails a day"],
  },
  {
    name: PLANS.days10.label,
    price: PLANS.days10.price,
    note: perDay(PLANS.days10),
    fit: "You want a quick push across many cities.",
    lines: ["Every city and state in India", "Everything in Free", "Reach HR teams in nearby and big cities", "Add more days any time"],
  },
  {
    name: PLANS.days30.label,
    price: PLANS.days30.price,
    note: perDay(PLANS.days30),
    fit: "You are searching seriously this month.",
    best: true,
    lines: ["Every city and state in India", "Everything in Free", "A full month to follow up and apply again", "Lowest price per day"],
  },
];

const PROMISES = [
  ["shield", "One-time payment", "No subscription, no auto-renewal, no hidden charges."],
  ["check", "Plan not opened? Full refund", "If your payment went through but cities did not open, you get your money back."],
  ["send", "Your emails, your Gmail", "We never send anything in your name. You press Send."],
  ["file", "Your data stays yours", "Delete your account and everything in it any time."],
];

const FAQ = [
  ["Do I need to pay to use it?", "No. The free plan covers every company in one city, with no time limit. Pay only if you also want to apply in other cities."],
  ["What happens when my days end?", "You go back to the free plan in your city. Nothing is deleted, and nothing is charged again."],
  ["Can I buy more days later?", "Yes. Buying again adds the new days on top of the days you still have."],
  ["How do I pay?", "UPI, debit or credit card, or net banking, through Razorpay, a secure Indian payment company. We never see your card or bank details."],
  ["Does paying guarantee a job?", "No one can promise that. Paying lets you reach many more HR teams, which gives you more chances. A short, personal email with your resume helps them remember you."],
];

export default async function PricingPage() {
  const signedIn = Boolean(await currentUser());
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="pricing-page">
        <section className="pricing-hero">
          <div className="wrap">
            <span className="eyebrow" style={{ color: "#C9BEFF" }}>Plans</span>
            <h1 className="h">More companies. <em>More chances.</em></h1>
            <p>
              Most students email every company in their own city first, and that is free. When you are ready to look
              further, open every city and state in India for a few days.
            </p>
          </div>
        </section>

        <div className="wrap pricing-body">
          <div className="price-grid">
            {CARDS.map((c) => (
              <section key={c.name} className={`price-card${c.best ? " best" : ""}`}>
                {c.best && <span className="plan-tag">Most chosen</span>}
                <h2>{c.name}</h2>
                <p className="price"><b>{c.price}</b> <span>{c.note}</span></p>
                <p className="fit">{c.fit}</p>
                <ul>
                  {c.lines.map((l) => <li key={l}><Icon name="check" size={16} /> {l}</li>)}
                </ul>
              </section>
            ))}
          </div>

          <PricingClient signedIn={signedIn} paymentsOn={paymentsEnabled()} />

          <div className="promises">
            {PROMISES.map(([icon, title, text]) => (
              <div key={title} className="promise">
                <span className="promise-ico"><Icon name={icon} size={18} /></span>
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="legal" style={{ padding: 0, maxWidth: 760 }}>
            <h2>Questions</h2>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
            <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
              Read the <a href="/refunds">refund policy</a> and <a href="/terms">terms</a>. Questions? <a href="/contact">Contact us</a>.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
