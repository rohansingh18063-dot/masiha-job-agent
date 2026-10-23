import { Header } from "../_components/ui";
import { HUB_URL } from "@/lib/config";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "How to use · Masiha Job Agent",
  description: "Step by step: make your resume, pick your city, and email HR teams from your own Gmail.",
};

const STEPS = [
  ["Make a free account", "Press Upload resume or Start building on the first page. Sign up with a username, or with Google in one tap."],
  ["Add your resume", "Upload your PDF or Word resume and we keep it exactly as it is. No resume yet? Answer a few questions and we make a clean resume for you. Pick the job you want, and tap the skills and strengths that are true for you."],
  ["Pick your state and city", "On the companies page, choose your state and city. You see companies there with their HR email and a trust score. The free plan covers one city: you can change it until you send your first email."],
  ["Write an email", "Press Write email on a company. A personal email appears in a second, using your name, the job you want and your own skills. Read it, change anything you like, or press Rewrite for different wording."],
  ["Send it from your Gmail", "Press Send in Gmail. On a computer your resume downloads at the same time: in Gmail, click the paperclip and attach it. On a phone, Send with resume opens Gmail with your resume already attached; paste the HR email we copied for you."],
  ["Tell us it went out", "Come back and press Yes, I sent it. The company moves to Contacted, so you never email the same HR team twice. If something went wrong, press No and send it again."],
  ["Follow up", "When an HR team replies, press They replied on that company in Contacted. You can send up to 20 emails a day."],
];

const FAQ = [
  ["Is it free?", `Yes: you can use one city for free, for as long as you like. To reach companies in every city and state, buy ${PLANS.days10.price} for ${PLANS.days10.label} or ${PLANS.days30.price} for ${PLANS.days30.label}. It is a one-time payment, not a subscription.`],
  ["Do you send emails for me?", "No. Every email goes from your own Gmail, only when you press Send. We never email anyone in your name."],
  ["Will a company surely reply?", "No one can promise that. A short, personal email with your resume attached helps the HR team remember you when a job opens. Send to many companies in your city and follow up politely."],
  ["My uploaded resume looks different?", "It does not change. The file you upload is the one you attach. We only read your details from it to write the emails."],
  ["How do I change my details?", "On the companies page, use the box in the left column (for example: \"My phone is 98XXXXXXXX\"), upload a newer resume, or press Build again."],
  ["How do I delete my account?", "Companies page → Your data → Delete my account. Everything about you is removed straight away."],
];

export default function GuidePage() {
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="wrap legal">
        <span className="eyebrow">Guide</span>
        <h1 className="h" style={{ marginTop: 6 }}>How to use Masiha Job Agent</h1>
        <p className="muted">Seven simple steps, from your resume to an email in an HR team&apos;s inbox.</p>
        <ol className="guide-steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <h2>Good to know</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}

        <p style={{ marginTop: 24 }}><a className="btn btn-iris" href="/">Start now</a></p>
      </main>
    </>
  );
}
