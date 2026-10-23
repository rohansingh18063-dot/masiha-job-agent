import { Header } from "../_components/ui";
import { HUB_URL } from "@/lib/config";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Privacy policy · Masiha Job Agent" };

const CONTACT = process.env.PRIVACY_CONTACT_EMAIL || BUSINESS.email;

export default function PrivacyPage() {
  return (
    <>
      <Header hubUrl={HUB_URL} />
      <main className="wrap legal">
        <h1 className="h">Privacy policy</h1>
        <p className="muted">How Masiha Job Agent uses your information. Last updated 23 October 2026.</p>

        <h2>What we keep</h2>
        <ul>
          <li><b>Your account:</b> your username and a scrambled copy of your password (nobody can read it back). If you use Google, your Google email address and name.</li>
          <li><b>Your resume:</b> the file you upload or the answers you give, and the details we read from it: name, phone, email, city, job title, skills, jobs and education.</li>
          <li><b>Your job search:</b> the job and city you pick, the emails we write for you, and which companies you said you emailed.</li>
          <li><b>Payments:</b> which plan you bought, the amount, the date and Razorpay's order and payment IDs. Your card, UPI or bank details go only to Razorpay and never reach us.</li>
          <li><b>Safety records:</b> your IP address together with counts of tries (for example wrong passwords), kept for at most 2 days to stop misuse.</li>
        </ul>

        <h2>Why we keep it</h2>
        <ul>
          <li>To make your resume and write a personal email to each company for you.</li>
          <li>So you never email the same HR team twice, and to keep the daily limits fair for everyone.</li>
          <li>To keep the service safe from people trying to break in or misuse it.</li>
        </ul>

        <h2>Who sees it</h2>
        <ul>
          <li>We do not sell your information or show it to companies. Emails go from <b>your own Gmail</b>, only when you press Send.</li>
          <li>Your resume file can be opened only by you, while you are logged in.</li>
          <li>To read an uploaded resume and to make some changes you ask for, its text is sent to Google&apos;s Gemini AI service.</li>
          <li>Your information is stored in our database with our hosting provider, and only our team can reach it.</li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>You can change your resume and details at any time on the companies page.</li>
          <li>You can delete your account at any time: companies page → <b>Delete my account</b>. This removes your account, resume, emails and everything else about you straight away. Payment records are kept only as long as tax law requires.</li>
          <li>{CONTACT ? <>For any question about your information, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</> : "For any question about your information, contact the Masiha team."}</li>
        </ul>

        <p className="muted"><a href="/">Back to Masiha Job Agent</a></p>
      </main>
    </>
  );
}
