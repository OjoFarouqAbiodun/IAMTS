// Stage 11 test helpers (ESM). Loaded by the CommonJS *.test.js files via
// require("./helpers.mjs"); Node 24 supports require(ESM) for modules without
// top-level await, and this module has none (the mysql pool is created lazily).
//
// SAFETY: this suite targets the staging HTTP layer on :3100 ONLY. It never
// issues a request to production (:3000). Because the staging process shares
// the production `iamts` database, every mutating test tracks the exact ids it
// creates and deletes only those. No secret (password, hash, token, session id,
// csrf token, DB credential) is ever printed by this module.

import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Read (never write) the project's .env for DB credentials.
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

// --- Hard safety guard ------------------------------------------------------
export const BASE = "http://localhost:3100";
const FORBIDDEN_PROD = ":3000";
if (BASE.includes(FORBIDDEN_PROD)) {
  throw new Error(
    "SAFETY ABORT: test BASE points at production (:3000). Refusing to run.",
  );
}

// Non-secret shared dev seed password used by the staging fixtures. Overridable
// via env so it is never hard-required; never logged.
const SEED_PASSWORD = process.env.STAGING_TEST_PASSWORD || "Password123!";

// Lazy mysql pool (created synchronously; connections open on first query).
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
  connectionLimit: 5,
  waitForConnections: true,
});

export function sha256hex(input) {
  return createHash("sha256").update(String(input)).digest("hex");
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Parse a set-cookie header list into { name: value } (first pair only).
export function parseSetCookie(setCookieHeaders) {
  const out = {};
  for (const sc of setCookieHeaders || []) {
    const pair = sc.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > -1) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

// Build a Cookie header string from a parsed cookie map (connect.sid + csrf).
export function cookieHeader(cookies) {
  const parts = [];
  if (cookies["connect.sid"]) parts.push(`connect.sid=${cookies["connect.sid"]}`);
  if (cookies["csrf_token"]) parts.push(`csrf_token=${cookies["csrf_token"]}`);
  return parts.join("; ");
}

// A cookie-jar-backed session that carries connect.sid + csrf_token and sends
// the double-submit CSRF header + Origin by default. Modeled on the existing
// prod_smoke/s7/s9 session helpers, retargeted to BASE (:3100).
export function makeSession() {
  let cookie = "";
  let csrf = null;

  function absorb(resp) {
    const set = resp.headers.getSetCookie ? resp.headers.getSetCookie() : [];
    if (set && set.length) {
      const c = parseSetCookie(set);
      const parts = [];
      if (c["connect.sid"]) parts.push(`connect.sid=${c["connect.sid"]}`);
      else if (cookie.includes("connect.sid")) {
        const existing = /connect\.sid=[^;]+/.exec(cookie);
        if (existing) parts.push(existing[0]);
      }
      if (c["csrf_token"]) parts.push(`csrf_token=${c["csrf_token"]}`);
      else if (csrf) parts.push(`csrf_token=${csrf}`);
      if (parts.length) cookie = parts.join("; ");
      if (c["csrf_token"]) csrf = c["csrf_token"];
    }
  }

  return {
    get csrf() {
      return csrf;
    },
    get cookie() {
      return cookie;
    },
    async login(email, password = SEED_PASSWORD) {
      const resp = await fetch(`${BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: BASE },
        body: JSON.stringify({ email, password }),
      });
      const c = parseSetCookie(resp.headers.getSetCookie());
      const parts = [];
      if (c["connect.sid"]) parts.push(`connect.sid=${c["connect.sid"]}`);
      if (c["csrf_token"]) parts.push(`csrf_token=${c["csrf_token"]}`);
      cookie = parts.join("; ");
      csrf = c["csrf_token"] || null;
      try {
        await resp.json();
      } catch {
        /* ignore */
      }
      return resp.status;
    },
    // opts: { origin (default BASE; pass null to omit), sendCsrf (default true),
    //         csrfValue (override header value), headers (extra) }
    async req(method, p, body, opts = {}) {
      const headers = {};
      if (cookie) headers.Cookie = cookie;
      const origin = "origin" in opts ? opts.origin : BASE;
      if (origin) headers.origin = origin;
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const sendCsrf = opts.sendCsrf !== false;
      if (sendCsrf) {
        const value = "csrfValue" in opts ? opts.csrfValue : csrf;
        if (value !== undefined && value !== null) headers["x-csrf-token"] = value;
      }
      Object.assign(headers, opts.headers || {});
      const resp = await fetch(`${BASE}${p}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let data = null;
      try {
        data = await resp.json();
      } catch {
        /* non-JSON body */
      }
      absorb(resp);
      return { status: resp.status, data };
    },
    logout() {
      return this.req("POST", "/logout");
    },
  };
}

// --- Low-level login helpers for the session-fixation test ------------------
// Return the raw parsed cookies so the test can compare session ids across
// logins. Never print the returned values.
export async function rawLogin(email, opts = {}) {
  const headers = { "Content-Type": "application/json", origin: BASE };
  if (opts.cookieHeader) headers.Cookie = opts.cookieHeader;
  const resp = await fetch(`${BASE}/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: opts.password || SEED_PASSWORD }),
  });
  const cookies = parseSetCookie(resp.headers.getSetCookie());
  try {
    await resp.json();
  } catch {
    /* ignore */
  }
  return { status: resp.status, cookies };
}

export async function getMe(cookieHeaderStr) {
  const resp = await fetch(`${BASE}/me`, {
    headers: cookieHeaderStr ? { Cookie: cookieHeaderStr } : {},
  });
  try {
    await resp.json();
  } catch {
    /* ignore */
  }
  return resp.status;
}

export async function rawLogout(cookies) {
  const ch = cookieHeader(cookies);
  const headers = { origin: BASE };
  if (ch) headers.Cookie = ch;
  if (cookies["csrf_token"]) headers["x-csrf-token"] = cookies["csrf_token"];
  const resp = await fetch(`${BASE}/logout`, { method: "POST", headers });
  try {
    await resp.json();
  } catch {
    /* ignore */
  }
  return resp.status;
}

// --- Audit-log secret scanner ----------------------------------------------
// Returns a list of REASON strings (never the offending values) for a row that
// appears to leak a secret. Keeps the seed-password literal encapsulated here
// so no test file has to embed it. Mirrors the prod_smoke.js scan.
const BCRYPT_RE = /\$2[aby]\$\d+\$/;
const FORBIDDEN_DETAIL_KEYS = [
  "password", "currentPassword", "newPassword", "token", "tokenHash",
  "token_hash", "sessionId", "csrf", "csrf_token", "resetUrl", "reset_url",
  "body", "headers", "stack", "sql", "sqlMessage",
];

export function findSecrets(row) {
  const reasons = [];
  const full = JSON.stringify(row);
  if (BCRYPT_RE.test(full)) reasons.push("bcrypt-hash");
  if (full.includes(SEED_PASSWORD)) reasons.push("password-value");
  if (full.includes("connect.sid")) reasons.push("session-id");
  let detail = row.detail;
  if (detail && typeof detail === "string") {
    try {
      detail = JSON.parse(detail);
    } catch {
      detail = null;
    }
  }
  if (detail && typeof detail === "object") {
    for (const k of Object.keys(detail)) {
      if (FORBIDDEN_DETAIL_KEYS.includes(k)) reasons.push(`forbidden-key:${k}`);
    }
  }
  return reasons;
}
