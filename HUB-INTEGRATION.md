# Adding Masiha Job Agent to the Masiha hub

The hub only shows a card. The card links to this app, and everything else happens inside the app.

## Steps

1. Start the Job Agent.
   - On your computer it runs at `http://localhost:3000`.
   - When it is live, use its real address, e.g. `https://jobs.yourdomain.com`.
2. Open the hub admin: `http://localhost:8000/admin` (live: `https://yourdomain.com/admin`).
3. Go to **Tool cards**.
   - If a "Job Agent" card already exists, click **Edit** on it.
   - If not, click **+ Add new tool**.
4. Fill in the card:

| Field | Value |
|---|---|
| Tool name | `Masiha Job Agent` |
| Website link | `http://localhost:3000` (live: your Job Agent address) |
| Category | Students & jobs |
| Status | Live |
| Price line on card | `20 free emails a day` |
| Icon | Briefcase |
| Order on page | `1` |
| Short description | `Build your resume, then send a personal email to HR teams in your city in one click.` |

5. Click **Save tool**. The card shows on the hub straight away.

## The other way round

The Job Agent header has an **All Masiha tools** link back to the hub. Set its address with `NEXT_PUBLIC_HUB_URL` in the Job Agent's `.env` file (or in the Hostinger environment variables), then rebuild.

## Check it works

1. Open the hub and click **Open tool** on the Job Agent card. The Job Agent should open.
2. In the hub admin, **Tool clicks today** should go up by 1.
3. In the Job Agent, click **All Masiha tools**. You should be back on the hub.
