/*
 * One-time move from the old data folder to PostgreSQL.
 *
 *   npm run db:import                  (reads ./data, or DATA_DIR if set)
 *
 * Safe to run again: rows that already exist in the database are left as they are.
 * Logged-in students stay logged in, because their sessions are copied too.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { query, tx, closeDb } from "../lib/db.js";

// Use the settings in .env when there is one (on a host, they may be set as environment variables instead).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file
}

const DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};
const list = async (sub) => {
  try {
    return await fs.readdir(path.join(DIR, sub));
  } catch {
    return [];
  }
};

async function main() {
  console.log(`Reading ${DIR}`);
  const counts = {};
  const count = (name, rowCount) => { counts[name] = (counts[name] || 0) + rowCount; };

  await tx(async (db) => {
    const accounts = await readJson(path.join(DIR, "accounts.json"), {});
    for (const [username, a] of Object.entries(accounts)) {
      const r = await db.query(
        `INSERT INTO accounts (username, user_id, password, created_at, reset_at)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5::timestamptz) ON CONFLICT DO NOTHING`,
        [username, a.userId, a.password, a.createdAt || null, a.resetAt || null],
      );
      count("accounts", r.rowCount);
    }

    for (const f of (await list("users")).filter((x) => x.endsWith(".json"))) {
      const u = await readJson(path.join(DIR, "users", f), null);
      if (!u?.id) continue;
      const r = await db.query(
        "INSERT INTO users (id, data, created_at) VALUES ($1, $2::jsonb, COALESCE($3::timestamptz, now())) ON CONFLICT DO NOTHING",
        [u.id, JSON.stringify(u), u.createdAt || null],
      );
      count("users", r.rowCount);
    }

    for (const f of (await list("sessions")).filter((x) => /^[a-f0-9]{64}\.json$/.test(x))) {
      const s = await readJson(path.join(DIR, "sessions", f), null);
      if (!s?.userId || !s.expiresAt || Date.parse(s.expiresAt) < Date.now()) continue;
      const r = await db.query(
        `INSERT INTO sessions (token_hash, user_id, epoch, created_at, expires_at)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5::timestamptz) ON CONFLICT DO NOTHING`,
        [f.slice(0, 64), s.userId, s.epoch || 0, s.createdAt || null, s.expiresAt],
      );
      count("sessions", r.rowCount);
    }

    const companies = await readJson(path.join(DIR, "companies.json"), []);
    for (const c of companies) {
      if (!c?.id) continue;
      const r = await db.query(
        "INSERT INTO companies (id, state, city, data) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT DO NOTHING",
        [c.id, c.state || "", c.city || "", JSON.stringify(c)],
      );
      count("companies", r.rowCount);
    }
    // Tell every running server to reload its company list.
    await db.query(
      `INSERT INTO app_meta (key, value) VALUES ('companies_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [`import-${Date.now()}`],
    );

    const roles = await readJson(path.join(DIR, "roles.json"), {});
    for (const [key, pack] of Object.entries(roles)) {
      const r = await db.query("INSERT INTO learned_roles (key, pack) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING", [key, JSON.stringify(pack)]);
      count("learned roles", r.rowCount);
    }

    for (const f of (await list("usage")).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x))) {
      const u = await readJson(path.join(DIR, "usage", f), {});
      const r = await db.query(
        "INSERT INTO usage_daily (day, ai, sends) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [f.slice(0, 10), u.ai || 0, u.sends || 0],
      );
      count("usage days", r.rowCount);
    }

    for (const f of (await list("resumes")).filter((x) => /^[a-f0-9]{24}\.pdf$/.test(x))) {
      const pdf = await fs.readFile(path.join(DIR, "resumes", f));
      const r = await db.query("INSERT INTO resume_files (token, pdf) VALUES ($1, $2) ON CONFLICT DO NOTHING", [f.slice(0, 24), pdf]);
      count("resume PDFs", r.rowCount);
    }
  });

  const total = await query("SELECT (SELECT count(*) FROM accounts)::int AS accounts, (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM companies)::int AS companies");
  console.log("Copied:", Object.keys(counts).length ? counts : "nothing new");
  console.log("Now in the database:", total.rows[0]);
}

main()
  .catch((err) => {
    console.error("Import failed, nothing was changed:", err.message);
    process.exitCode = 1;
  })
  .finally(closeDb);
