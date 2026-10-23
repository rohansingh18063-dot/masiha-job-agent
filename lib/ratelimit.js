import { query } from "./db";
import { UserError } from "./errors";

/*
 * Rate limits kept in PostgreSQL, so they hold across restarts and across servers.
 * Each key counts hits in a fixed window (e.g. "login-user:rohit", 10 per 15 minutes).
 */

/** Counts one hit. Returns false once the key has gone over max in this window. */
export async function hit(key, max, windowSec) {
  const { rows } = await query(
    `INSERT INTO rate_limits (key, window_start, hits) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.hits + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING hits`,
    [key, windowSec],
  );
  if (Math.random() < 0.01) query("DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'").catch(() => {});
  return rows[0].hits <= max;
}

/** True when the key already used up max in this window (does not count a hit). */
export async function blocked(key, max, windowSec) {
  const { rows } = await query(
    "SELECT hits FROM rate_limits WHERE key = $1 AND window_start >= now() - make_interval(secs => $2)",
    [key, windowSec],
  );
  return (rows[0]?.hits || 0) >= max;
}

export async function clearLimit(key) {
  await query("DELETE FROM rate_limits WHERE key = $1", [key]);
}

/** Counts one hit and throws a friendly 429 when over the limit. */
export async function limit(key, max, windowSec, message = "You are going a little fast. Please wait a minute and try again.") {
  if (!(await hit(key, max, windowSec))) throw new UserError(message, 429);
}
