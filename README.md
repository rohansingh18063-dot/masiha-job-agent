# Masiha Job Agent

A job seeker makes a profile once. Then, for every company in their city, they get a personal email to that company's HR team, ready to send from their own Gmail in one click.

## How it works

1. **Account**: the user signs up at `/signup` with a username and password, and logs in at `/login`. Everything below needs a login.
   - Passwords are stored only as salted scrypt hashes (the `accounts` table). Nobody can read them.
   - Login sessions last 30 days. Only a hash of each session token is saved (the `sessions` table), so a copy of the database cannot be used to log in.
   - After 10 wrong passwords for a username (or 30 from one network), login is blocked for 15 minutes. See **Security** below.
   - Forgotten password: Admin → **Reset a student's password**. This also logs the student out on every device.
   - Someone who made a profile before accounts existed keeps it when they sign up in the same browser.
2. **Profile**: the user uploads a resume (PDF or Word) or answers 9 chat questions. An uploaded file is kept exactly as it is and becomes the resume the student attaches. The app reads its text instantly (name, contact, job title, skills), and one small Gemini call adds jobs and education in the background; set `UPLOAD_AI=off` to skip that call. Chat answers are filled into a fixed resume format from the role library (below), without Gemini, and the app makes a clean PDF from them.
3. **Companies**: the user picks a state and city (or searches) and sees each company's name, city, website, HR email and trust score. Search does not use AI.
4. **Email**: "Write email" fills in an email for that company from the role library, using the company's name and city, the job the user wants, and only skills and facts that are in the resume. There are 3 wordings; different companies get different ones, and "Rewrite" moves to the next. No Gemini call.
5. **Send**: "Send in Gmail" opens Gmail with the To, Subject and email already filled in. The user checks it and presses Send.
6. **Rules**:
   - Up to 20 emails per user per day.
   - Once a user emails an HR address, that company moves to "Contacted" for good. Any other company row with the same HR email is blocked for that user too.
   - "Send in Gmail" only opens Gmail. The company moves to "Contacted" when the user confirms "Yes, I sent it".

## Role library (saves Gemini calls)

- `lib/roles-data.js` has about 28 common jobs (developers, data analyst, accountant, HR, sales, support, teacher, engineers…). Each has job titles and other words people type, an "I enjoy…" line, a team name, a resume summary line and typical skills.
- "fresher java dev", "react frontend developer" and "tally" all match a role. Words like fresher, job and senior are ignored.
- A job that is not in the library is described by Gemini **once** and saved in the `learned_roles` table. Everyone after that with the same job uses the saved copy. If Gemini is not available, a plain wording is used and it tries again next time.
- To add or fix a role, edit `lib/roles-data.js`. To fix a saved one, edit or delete its row in the `learned_roles` table.
- Gemini is still used for one small background read of an uploaded resume (off with `UPLOAD_AI=off`) and for "Change your resume" requests.
   - Emails do not contain a resume link. Each email box reminds the user to attach their resume PDF in Gmail and has a "Download resume PDF" button.

## Run on your computer

You need Node.js 20 or newer.

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `GEMINI_API_KEY` and `ADMIN_PASSWORD`.
2. Run:

```
npm install && npm run build && npm start
```

- App: http://localhost:3000
- Admin: http://localhost:3000/admin

To try it without a Gemini key, set `MOCK_AI=1` in `.env`. The AI answers are then fake test text.

## What you need

| Setting | What it is | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Your PostgreSQL host (see below) |
| `GEMINI_API_KEY` | AI for resumes and emails | aistudio.google.com, free. Use a project **without billing** so you never pay. |
| `ADMIN_PASSWORD` | Password for `/admin` | Choose your own |
| `NEXT_PUBLIC_HUB_URL` | Link back to the Masiha hub | Your hub address |

## Database (PostgreSQL)

All data is saved in PostgreSQL. Set `DATABASE_URL`, for example:

```
DATABASE_URL=postgres://user:password@host:5432/masiha?sslmode=require
```

- Any PostgreSQL 13 or newer works. Free options: **Neon** (neon.tech) or **Supabase** (supabase.com). On a Hostinger VPS you can also install PostgreSQL yourself. Hostinger's shared Node.js plans do not include PostgreSQL, so use Neon or Supabase there.
- The tables are created automatically the first time the app starts. There is nothing to run by hand.
- Tables: `accounts` (usernames and password hashes), `users` (profile, preferences, emails written and companies contacted, as JSON), `sessions`, `companies`, `learned_roles`, `usage_daily` (daily counts), `resume_files` (resume PDFs) and `app_meta`.
- Changes to a user happen in a transaction with the row locked, so you can run more than one server.
- Optional: `DATABASE_POOL_SIZE` (default 10) sets how many connections each server keeps open.

**Moving from the old `data` folder:** set `DATABASE_URL`, then run `npm run db:import` once. It copies accounts, users, logins, companies, saved roles, daily counts and resume PDFs into PostgreSQL. Running it again is safe: rows already in the database are left alone. Keep the `data` folder as a backup; the app no longer reads it.

## Plans and payments (Razorpay)

- **Free:** companies in one city. A student can change that city until they send their first email; then it is fixed.
- **₹99 for 10 days** or **₹199 for 30 days:** every city and state. Buying again adds the days on top. One-time payment, no auto-renewal. Prices are in `lib/plans.js`.
- The free limit is checked on the server (company list, writing and sending emails), so it cannot be skipped from the browser.
- A payment counts only after the server checks Razorpay's signature **and** asks Razorpay that the money arrived for that order and amount. Each order adds days once, even if confirmed twice. If the student closes the page right after paying, the webhook still adds the days.
- The limit and the plan buttons are on only when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set. Without them, everyone can use every city.
- Admin shows active plans and money earned today and all time.

Setup:
1. Make an account at dashboard.razorpay.com and finish KYC. Razorpay checks that the site has Terms, Privacy, Refund and Contact pages; they are at `/terms`, `/privacy`, `/refunds` and `/contact`, linked in the footer. Fill in `BUSINESS_NAME`, `CONTACT_EMAIL`, `CONTACT_PHONE` and `BUSINESS_ADDRESS` so they show there.
2. Start in **Test mode**: Account & Settings → API Keys → generate test keys (`rzp_test_…`), put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and pay with Razorpay's test cards or UPI. No real money moves.
3. Webhooks → Add: URL `https://your-domain.com/api/pay/webhook`, events `payment.captured` and `order.paid`, and a secret, which you also put in `RAZORPAY_WEBHOOK_SECRET`. (A webhook cannot reach `localhost`. On your computer, payments still work through the page.)
4. When Razorpay activates your account, switch to the **Live** keys and make a live webhook the same way.

## Security

What the app does for you:
- **Limits stored in the database** (`rate_limits` table), so they hold across restarts and servers: 10 wrong passwords per username or 30 per network → 15-minute block; 5 new accounts per network per hour and 1000 per day site-wide (`SIGNUPS_PER_DAY`); 5 wrong admin passwords per network → 15-minute block; limits on uploads, company lists, emails written and Gemini-backed requests.
- **Real visitor IP:** the app counts back from the end of `X-Forwarded-For`, which visitors cannot fake. Set `TRUST_PROXY_HOPS` to the number of proxies in front of the app (1 on Hostinger, 0 if there are none).
- **Optional "I am human" check** on sign-up (Cloudflare Turnstile, free): set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- **Uploads:** you must be logged in before a file is read; PDFs over 10 pages are refused; reading stops after 8 seconds.
- **Company list:** only students with a profile see it, at most 60 pages a minute and 600 a day.
- **Resume files** open only for their owner (or the admin).
- **Role text from Gemini** is cleaned before it is shared: no links, emails, domains or instructions.
- **Browser protection:** a Content Security Policy with a fresh nonce on every page (`proxy.js`), no framing, HTTPS-only (HSTS), and no camera, microphone or location access.
- **Privacy:** sign-up needs agreement to `/privacy`; students can delete their account and all their data from the companies page.

What you need to do:
- Keep `.env` private: never upload it, share it or put it in a screenshot or zip. It holds the keys to everything.
- Use an `ADMIN_PASSWORD` of at least 12 characters (Admin refuses shorter ones); 20 or more is best.
- Delete or lock away the old `data` folder once you no longer need it as a backup. It holds personal data.
- Run `npm audit` every month and update packages (`npm update`).
- Review `/privacy` and add `PRIVACY_CONTACT_EMAIL`. Ask a lawyer if you need full compliance with India's data protection law (DPDP Act).

## Sign in with Google (optional)

Students can press **Continue with Google** instead of making a username and password. The button only appears when both settings below are set.

1. Go to console.cloud.google.com and create a project (free).
2. **APIs & Services → OAuth consent screen**: choose **External**. Fill in the app name, a support email and your developer email. Add the scopes `openid`, `email` and `profile` only. Then press **Publish app** so anyone can sign in (in "Testing" mode only the test users you list can). These basic scopes do not need Google's review. If you add a logo, Google may ask to verify the app first, so leave the logo empty unless you need it.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorised redirect URIs** add, exactly:
   - `http://localhost:3000/api/auth/google/callback` (your computer)
   - `https://your-domain.com/api/auth/google/callback` (the live site)
4. Copy the Client ID and Client secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. On the live site, also set `APP_URL` to your address, so the redirect address matches what you entered in step 3.

How it works:
- The first time, a student account is made with a username from the Gmail address (for example `rohit.singh`, or `rohit.singh2` if that is taken). Next time, the same Google account opens the same student account.
- Google-only accounts have no password, so they cannot log in with a username and password unless you set one in Admin → Reset a password.
- A student who already has a username account and then uses Google gets a second, separate account. The two are not joined automatically.
- Keep the Client secret private, like a password. If it leaks, create a new one in Google Cloud and replace it.

## Adding companies

Go to Admin → **Add companies (Excel or CSV)** and upload a `.xlsx` or `.csv` file. Only the first sheet is read. Columns (any order):

```
Company, Website, Email Type, Best Email (HR first), Email 2, Email 3, Likely HR Email (guess),
Email Found On, Career Page, Contact Page, Phone, Address, City, State, LinkedIn Page,
Trust Score, Notes, Source, Updated
```

- Required: **Company, City, State** and at least one email. Rows missing one are skipped and listed after the upload.
- The email sent to is **Best Email**. If it is empty, Email 2, Email 3, then the guessed HR email is used (marked "guess").
- State can be the full name or a short form (MP, UP, Orissa, New Delhi…).
- Trust can be 0–100, a percent, 0–1, out of 5 or 10, or High / Medium / Low. Students see companies with the highest trust first.
- Students see 5 details only: Company, City, Website, HR email and Trust. Admin → **Search companies** shows every column and how many students emailed each company.
- Uploading the same company + city again updates it. Everything is saved in the `companies` table and stays until you delete it.
- The old CSV format (`company,website,email,state,city,industry,about`) still works.
- Only add emails that companies publish themselves for hiring, such as careers pages and job posts. Do not scrape LinkedIn or other sites that forbid it.

## Go live on Hostinger

You need a plan with Node.js web apps (for example Business or Cloud).

1. hPanel → **Websites → Add website → Node.js app**. Upload this folder as a zip, without `node_modules`, `.next` and `data`.
2. Build command: `npm run build`. Start command: `npm start`. Node version: 20 or newer.
3. Add the settings from `.env.example` as environment variables. Also set:
   - `APP_URL` to your address, e.g. `https://jobs.yourdomain.com`
   - `DATABASE_URL` to your PostgreSQL connection string
4. Deploy, then open `/admin` and import your companies.

Back up the database from time to time. Neon and Supabase keep automatic backups; on your own server, use `pg_dump`.
