import { query } from "./db";
import { todayIST } from "./store";

/** Counts one Gemini call for the whole site today. Returns false once today's limit is reached. */
export async function takeSiteAi(limit) {
  if (limit <= 0) return false;
  const { rowCount } = await query(
    `INSERT INTO usage_daily (day, ai) VALUES ($1, 1)
     ON CONFLICT (day) DO UPDATE SET ai = usage_daily.ai + 1 WHERE usage_daily.ai < $2`,
    [todayIST(), limit],
  );
  return rowCount > 0;
}

/** Counts one email sent today, across the whole site. */
export async function countSiteSend() {
  await query(
    `INSERT INTO usage_daily (day, sends) VALUES ($1, 1)
     ON CONFLICT (day) DO UPDATE SET sends = usage_daily.sends + 1`,
    [todayIST()],
  );
}

export async function siteUsageToday() {
  const { rows } = await query("SELECT ai, sends FROM usage_daily WHERE day = $1", [todayIST()]);
  return rows[0] || { ai: 0, sends: 0 };
}
