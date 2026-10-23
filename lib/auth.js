import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import { randomId } from "./store";
import { hit, blocked, limit, clearLimit } from "./ratelimit";
import { checkCaptcha } from "./captcha";
import { clientIp } from "./http";
import { loadUser, updateUser } from "./users";
import { UserError } from "./errors";

/*
 * Student accounts.
 * - Passwords are stored only as salted scrypt hashes (accounts table). Nobody can read them back.
 * - A login gives a random 256-bit token in an httpOnly cookie. Only a SHA-256 of the token is saved
 *   (sessions table), so a copy of the database cannot be used to log in.
 * - Resetting a password logs that student out everywhere (sessionEpoch).
 */

const SESSION_COOKIE = "mja_session";
const OLD_COOKIE = "mja_uid"; // browsers from before accounts existed
const SESSION_DAYS = 30;

const USERNAME_RE = /^[a-z0-9][a-z0-9_.]{2,29}$/;
const EASY = new Set(["password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "11111111", "iloveyou", "abcd1234", "india123", "admin123"]);

export const cleanUsername = (u) => String(u || "").trim().toLowerCase();

function checkUsername(username) {
  if (!USERNAME_RE.test(username)) {
    throw new UserError("Username must be 3 to 30 characters: small letters, numbers, _ or . (start with a letter or number).");
  }
}

export function checkPassword(password, username = "") {
  if (typeof password !== "string" || password.length < 8) throw new UserError("Password must be at least 8 characters.");
  if (password.length > 200) throw new UserError("Password is too long.");
  if (EASY.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) throw new UserError("That password is too easy to guess. Please choose another.");
  if (username && password.toLowerCase().includes(username)) throw new UserError("Password must not contain your username.");
}

/* ---------------- Passwords ---------------- */

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password.normalize("NFKC"), salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))));

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(password, salt)).toString("hex")}`;
}

// Used when the username does not exist, so a wrong username takes as long as a wrong password.
const DUMMY_HASH = `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`;

async function passwordMatches(password, stored) {
  const [kind, saltHex, keyHex] = String(stored || "").split("$");
  if (kind !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"));
  const want = Buffer.from(keyHex, "hex");
  return want.length === key.length && crypto.timingSafeEqual(key, want);
}

/* ---------------- Brute-force and sign-up limits (stored in the database) ---------------- */

const FIFTEEN_MIN = 15 * 60;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const SIGNUPS_PER_DAY = Number(process.env.SIGNUPS_PER_DAY || 1000); // across the whole site

/** Throws if this IP (or the whole site today) has made too many new accounts. Counts this one. */
async function allowNewAccount(ip) {
  if (await blocked(`signup-ip:${ip}`, 5, HOUR)) throw new UserError("Too many new accounts from here. Please try again in an hour.", 429);
  if (await blocked("signup-all", SIGNUPS_PER_DAY, DAY)) throw new UserError("We have had a lot of new accounts today. Please try again tomorrow.", 429);
  await hit(`signup-ip:${ip}`, 5, HOUR);
  await hit("signup-all", SIGNUPS_PER_DAY, DAY);
}

/* ---------------- Sessions ---------------- */

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

async function startSession(userId) {
  const user = await loadUser(userId);
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO sessions (token_hash, user_id, epoch, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
    [tokenHash(token), userId, user?.sessionEpoch || 0, SESSION_DAYS],
  );
  // Now and then, clear out sessions that have expired.
  if (Math.random() < 0.05) await query("DELETE FROM sessions WHERE expires_at < now()");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
  jar.delete(OLD_COOKIE);
}

/** The logged-in student, or null. */
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = tokenHash(token);
  const { rows } = await query("SELECT user_id, epoch, expires_at < now() AS expired FROM sessions WHERE token_hash = $1", [hash]);
  const session = rows[0];
  if (!session) return null;
  if (session.expired) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hash]);
    return null;
  }
  const user = await loadUser(session.user_id);
  if (!user || (user.sessionEpoch || 0) !== (session.epoch || 0)) return null;
  return user;
}

/** The logged-in student. Throws a 401 if nobody is logged in. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new UserError("Please log in.", 401);
  return user;
}

/* ---------------- Sign up, log in, log out ---------------- */

export async function signup(req, { username: rawName, password, agree, captcha }) {
  const ip = clientIp(req);
  // Attempts are limited too, so nobody can try thousands of usernames to see which exist.
  await limit(`signup-try:${ip}`, 20, HOUR, "Too many tries from here. Please wait an hour and try again.");

  const username = cleanUsername(rawName);
  checkUsername(username);
  checkPassword(password, username);
  if (agree !== true) throw new UserError("Please agree to the privacy policy to make an account.");
  await checkCaptcha(captcha, ip);
  const { rowCount: taken } = await query("SELECT 1 FROM accounts WHERE username = $1", [username]);
  if (taken) throw new UserError("That username is already taken. Please choose another.", 409);
  await allowNewAccount(ip);
  const hash = await hashPassword(password);

  // Someone who built a profile in this browser before accounts existed keeps it.
  const jar = await cookies();
  const oldId = jar.get(OLD_COOKIE)?.value || "";
  let userId = randomId(16);
  if (/^[a-f0-9]{32}$/.test(oldId)) {
    const old = await loadUser(oldId);
    if (old && !old.username) userId = oldId;
  }

  const created = await query(
    "INSERT INTO accounts (username, user_id, password) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
    [username, userId, hash],
  );
  if (!created.rowCount) throw new UserError("That username is already taken. Please choose another.", 409);

  await updateUser(userId, (u) => {
    u.username = username;
    u.agreedAt = new Date().toISOString(); // when they accepted the privacy policy
  });
  await startSession(userId);
}

export async function login(req, { username: rawName, password }) {
  const username = cleanUsername(rawName).slice(0, 30);
  const ip = clientIp(req);
  if ((await blocked(`login-ip:${ip}`, 30, FIFTEEN_MIN)) || (await blocked(`login-user:${username}`, 10, FIFTEEN_MIN))) {
    throw new UserError("Too many wrong tries. Please wait 15 minutes and try again.", 429);
  }
  // Every try counts per IP (password checks are slow on purpose, so this also stops floods).
  await limit(`login-any:${ip}`, 60, FIFTEEN_MIN, "Too many tries. Please wait 15 minutes and try again.");

  const { rows } = await query("SELECT user_id, password FROM accounts WHERE username = $1", [username]);
  const account = rows[0] || null;
  const ok = (await passwordMatches(String(password || "").slice(0, 200), account?.password || DUMMY_HASH)) && account;
  if (!ok) {
    await hit(`login-ip:${ip}`, 30, FIFTEEN_MIN);
    await hit(`login-user:${username}`, 10, FIFTEEN_MIN);
    throw new UserError("Wrong username or password.", 401);
  }
  await clearLimit(`login-user:${username}`);
  await startSession(account.user_id);
}

/* ---------------- Continue with Google ---------------- */

// Stored instead of a password hash for Google-only accounts, so a password login can never match.
const NO_PASSWORD = "google-login";

/** A free username from the email: "Rohit.Singh+jobs@gmail.com" -> "rohit.singh", then "rohit.singh2"… */
async function claimUsername(email, userId) {
  let base = String(email).split("@")[0].split("+")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").replace(/^[^a-z0-9]+/, "").slice(0, 26);
  if (base.length < 3) base = `${base}user`.slice(0, Math.max(3, base.length + 4));
  for (let i = 1; i <= 30; i++) {
    const name = i === 1 ? base : `${base}${i}`;
    const { rowCount } = await query(
      "INSERT INTO accounts (username, user_id, password) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [name, userId, NO_PASSWORD],
    );
    if (rowCount) return name;
  }
  const name = `user${randomId(5)}`;
  await query("INSERT INTO accounts (username, user_id, password) VALUES ($1, $2, $3)", [name, userId, NO_PASSWORD]);
  return name;
}

/** Logs in the Google account, creating a student account for it the first time (same limits as sign-up). */
export async function loginWithGoogle({ sub, email, name }, ip) {
  const { rows: known } = await query("SELECT user_id FROM identities WHERE provider = 'google' AND subject = $1", [sub]);
  if (known[0]) {
    await query("UPDATE identities SET email = $2 WHERE provider = 'google' AND subject = $1", [sub, email]);
    await startSession(known[0].user_id);
    return;
  }
  await allowNewAccount(ip);
  const fresh = randomId(16);
  const claimed = await query(
    "INSERT INTO identities (provider, subject, user_id, email) VALUES ('google', $1, $2, $3) ON CONFLICT DO NOTHING",
    [sub, fresh, email],
  );
  if (claimed.rowCount) {
    const username = await claimUsername(email, fresh);
    await updateUser(fresh, (u) => {
      u.username = username;
      u.email = email;
      u.googleName = name;
      u.agreedAt = new Date().toISOString(); // the Google button says continuing means agreeing to the privacy policy
    });
    await startSession(fresh);
    return;
  }
  const { rows } = await query("SELECT user_id FROM identities WHERE provider = 'google' AND subject = $1", [sub]);
  await query("UPDATE identities SET email = $2 WHERE provider = 'google' AND subject = $1", [sub, email]);
  await startSession(rows[0].user_id);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value || "";
  if (/^[a-f0-9]{64}$/.test(token)) await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Admin: set a new password for a student and log them out everywhere. */
export async function resetPassword(rawName, password) {
  const username = cleanUsername(rawName);
  checkPassword(password, username);
  const hash = await hashPassword(password);
  const { rows } = await query(
    "UPDATE accounts SET password = $2, reset_at = now() WHERE username = $1 RETURNING user_id",
    [username, hash],
  );
  const userId = rows[0]?.user_id;
  if (!userId) throw new UserError("No student with that username.", 404);
  await updateUser(userId, (u) => { u.sessionEpoch = (u.sessionEpoch || 0) + 1; });
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await clearLimit(`login-user:${username}`);
}

export async function accountCount() {
  const { rows } = await query("SELECT count(*)::int AS n FROM accounts");
  return rows[0].n;
}
