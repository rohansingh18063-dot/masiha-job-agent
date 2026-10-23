import { query, tx } from "./db";
import { randomId, todayIST } from "./store";
import { planInfo } from "./plans";
import { DAILY_SEND_LIMIT } from "./config";

function newUser(id) {
  return {
    id,
    username: "",
    createdAt: new Date().toISOString(),
    resumeToken: randomId(12),
    profile: null,
    resumeVersion: 0,
    prefs: { targetRole: "", state: "", city: "" },
    contacts: {},
    drafts: {},
    usage: { day: todayIST(), sends: 0, ai: 0 },
  };
}

function freshUsage(user) {
  const day = todayIST();
  if (!user.usage || user.usage.day !== day) user.usage = { day, sends: 0, ai: 0 };
  return user.usage;
}

export async function loadUser(id) {
  const { rows } = await query("SELECT data FROM users WHERE id = $1", [id]);
  const user = rows[0]?.data || null;
  if (user) freshUsage(user);
  return user;
}

/**
 * Reads the user, lets mutate() change it, and saves it, all in one transaction with the row locked,
 * so two requests for the same user run one after the other. Returns what mutate returns (or the user).
 */
export async function updateUser(id, mutate) {
  return tx(async (db) => {
    await db.query("INSERT INTO users (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING", [id, JSON.stringify(newUser(id))]);
    const { rows } = await db.query("SELECT data FROM users WHERE id = $1 FOR UPDATE", [id]);
    const user = rows[0].data;
    freshUsage(user);
    const result = await mutate(user);
    await db.query("UPDATE users SET data = $2::jsonb, updated_at = now() WHERE id = $1", [id, JSON.stringify(user)]);
    return result === undefined ? user : result;
  });
}

/**
 * Returns this user's earlier email to the company, or null. A company counts as contacted for good
 * once the user emails it, or once they email the same HR address from any other company row.
 */
export function contactFor(user, company) {
  const direct = user.contacts?.[company.id];
  if (direct) return { ...direct, companyId: company.id };
  const to = company.emails?.[0];
  for (const [companyId, c] of Object.entries(user.contacts || {})) {
    if (to && (c.emails || []).includes(to)) return { ...c, companyId, sameHr: true };
  }
  return null;
}

/** How many users have emailed each company id (for the admin view). */
export async function contactCounts() {
  const { rows } = await query(
    `SELECT k AS id, count(*)::int AS n
       FROM users, jsonb_object_keys(COALESCE(data->'contacts', '{}'::jsonb)) AS k
      GROUP BY k`,
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

/** "Delete my account": removes the student's account, logins, Google link, resume file and all their data. */
export async function deleteUserData(userId) {
  await tx(async (db) => {
    const { rows } = await db.query("SELECT data->>'resumeToken' AS token FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (rows[0]?.token) await db.query("DELETE FROM resume_files WHERE token = $1", [rows[0].token]);
    await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM identities WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM accounts WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
  });
}

/** Totals for the admin dashboard. */
export async function userStats() {
  const { rows } = await query(
    `SELECT count(*)::int AS visitors,
            count(*) FILTER (WHERE jsonb_typeof(data->'profile') = 'object')::int AS profiles,
            COALESCE(sum((SELECT count(*) FROM jsonb_object_keys(COALESCE(data->'contacts', '{}'::jsonb)))), 0)::int AS contacted
       FROM users`,
  );
  return rows[0];
}

// The background read of an upload gives up after 45 seconds. Two minutes on, the spinner always stops,
// even if that read never ran (for example, when the upload failed half-way).
const READ_LIMIT_MS = 2 * 60 * 1000;
const stillReading = (p) => Boolean(p.reading && p.readAt && Date.now() - Date.parse(p.readAt) < READ_LIMIT_MS);

export function publicUser(user) {
  const usage = freshUsage(user);
  return {
    username: user.username || "",
    hasProfile: Boolean(user.profile),
    profile: user.profile && { ...user.profile, reading: stillReading(user.profile) },
    prefs: user.prefs,
    resumeUrl: user.profile ? `/r/${user.resumeToken}?v=${user.resumeVersion}` : null,
    resumeType: user.resumeType === "docx" ? "docx" : "pdf",
    resumeSource: user.profile?.source === "upload" ? "upload" : "built",
    sentToday: usage.sends,
    sendLimit: DAILY_SEND_LIMIT,
    contactedCount: Object.keys(user.contacts || {}).length,
    plan: planInfo(user),
  };
}
