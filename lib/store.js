import crypto from "node:crypto";

// Data lives in PostgreSQL now (see lib/db.js). These small helpers are shared by several modules.

export function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Today's date in India (YYYY-MM-DD). Daily limits reset at midnight IST. */
export function todayIST() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}
