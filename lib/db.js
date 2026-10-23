import pg from "pg";

/*
 * PostgreSQL. Set DATABASE_URL in .env, e.g.
 *   DATABASE_URL=postgres://user:password@host:5432/masiha?sslmode=require
 * The tables below are created on first use, so an empty database works straight away.
 *
 * Users keep their profile, emails written and companies contacted in one JSON document (users.data),
 * changed inside a transaction with a row lock, so two requests can never overwrite each other.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  username   text PRIMARY KEY,
  user_id    text NOT NULL UNIQUE,
  password   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reset_at   timestamptz
);
CREATE TABLE IF NOT EXISTS users (
  id         text PRIMARY KEY,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL,
  epoch      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id);
CREATE TABLE IF NOT EXISTS companies (
  id         text PRIMARY KEY,
  state      text NOT NULL,
  city       text NOT NULL,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companies_state_city ON companies (state, city);
CREATE TABLE IF NOT EXISTS learned_roles (
  key        text PRIMARY KEY,
  pack       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usage_daily (
  day   date PRIMARY KEY,
  ai    integer NOT NULL DEFAULT 0,
  sends integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS resume_files (
  token      text PRIMARY KEY,
  pdf        bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- The student's own upload can be a Word file, so each resume file has a type.
ALTER TABLE resume_files ADD COLUMN IF NOT EXISTS mime text NOT NULL DEFAULT 'application/pdf';
-- Sign-in with Google (or another provider later): which outside account belongs to which user.
CREATE TABLE IF NOT EXISTS identities (
  provider   text NOT NULL,
  subject    text NOT NULL,
  user_id    text NOT NULL,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS identities_user_id ON identities (user_id);
-- Razorpay orders. A plan is granted once per order, when its payment is confirmed.
CREATE TABLE IF NOT EXISTS payments (
  order_id   text PRIMARY KEY,
  user_id    text NOT NULL,
  plan       text NOT NULL,
  amount     integer NOT NULL,
  currency   text NOT NULL DEFAULT 'INR',
  status     text NOT NULL DEFAULT 'created',
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at    timestamptz
);
CREATE INDEX IF NOT EXISTS payments_user_id ON payments (user_id);
-- Rate limits (wrong passwords, sign-ups, uploads…), shared by every server and kept across restarts.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);
`;

// One pool per process. Next.js dev reloads modules often, so it lives on globalThis.
const g = globalThis;

function pool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add your PostgreSQL connection string to the .env file (see README).");
  }
  if (!g.__mjaPool) {
    g.__mjaPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DATABASE_POOL_SIZE || 10) });
    g.__mjaPool.on("error", (err) => console.error("PostgreSQL pool error", err));
  }
  return g.__mjaPool;
}

/**
 * Creates the tables once per process, and again whenever SCHEMA changes (a dev server keeps running
 * across code edits, so new columns must still be added). A lock stops two servers doing it at once.
 */
function ready() {
  if (g.__mjaReadyFor !== SCHEMA) {
    g.__mjaReady = null;
    g.__mjaReadyFor = SCHEMA;
  }
  if (!g.__mjaReady) {
    g.__mjaReady = (async () => {
      const client = await pool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(727401)");
        await client.query(SCHEMA);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    })().catch((err) => {
      g.__mjaReady = null; // try again on the next request
      throw err;
    });
  }
  return g.__mjaReady;
}

export async function query(text, params) {
  await ready();
  return pool().query(text, params);
}

/** Runs fn(client) in one transaction. Throwing inside rolls everything back. */
export async function tx(fn) {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Closes the pool (for scripts). */
export async function closeDb() {
  await g.__mjaPool?.end();
  g.__mjaPool = null;
  g.__mjaReady = null;
}
