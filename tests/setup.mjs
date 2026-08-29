// Stage 11 shared setup + DB introspection helpers (ESM).
// Read-only against the DB except where a *.test.js explicitly creates and
// tears down its own fixtures. No secrets are logged here.

import { BASE, pool } from "./helpers.mjs";

// preflight(): assert the target on :3100 is a reachable IAMTS staging process
// backed by the shared `iamts` DB, before any fixture is created. Throws (which
// fails the calling before() hook and skips that file's tests) on any mismatch.
export async function preflight() {
  // 1. Static login page served -> app is up.
  const login = await fetch(`${BASE}/login.html`);
  if (login.status !== 200) {
    throw new Error(`preflight: GET /login.html expected 200, got ${login.status}`);
  }
  // 2. Anonymous /me is rejected -> auth middleware is the IAMTS one.
  const me = await fetch(`${BASE}/me`);
  if (me.status !== 401) {
    throw new Error(`preflight: GET /me (anon) expected 401, got ${me.status}`);
  }
  // 3. The known seed admin exists and is Active in the connected DB.
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? AND status = 'Active' LIMIT 1",
    ["kalagbala@iamts.com"],
  );
  if (rows.length === 0) {
    throw new Error(
      "preflight: seed admin kalagbala@iamts.com not found/active in connected DB",
    );
  }
}

// Find an Active user of a given role, optionally excluding an id.
export async function findUserByRole(role, opts = {}) {
  const params = [role];
  let sql = "SELECT id, email FROM users WHERE role = ? AND status = 'Active'";
  if (opts.excludeId) {
    sql += " AND id <> ?";
    params.push(opts.excludeId);
  }
  sql += " ORDER BY id LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

// A category id for the FK on a freshly-created test asset (Active preferred).
export async function findActiveCategoryId() {
  const [active] = await pool.query(
    "SELECT id FROM asset_categories WHERE status = 'Active' ORDER BY id LIMIT 1",
  );
  if (active[0]) return active[0].id;
  const [any] = await pool.query("SELECT id FROM asset_categories ORDER BY id LIMIT 1");
  return any[0] ? any[0].id : null;
}

// Any existing asset id (for the maintenance FK). We never mutate this asset:
// the non-owner PATCH throws before any UPDATE, and the owner path is a GET.
export async function findAssetId() {
  const [rows] = await pool.query("SELECT id FROM assets ORDER BY id LIMIT 1");
  return rows[0] ? rows[0].id : null;
}

export async function tableCount(table) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(rows[0].n);
}

export async function maxId(table, col = "id") {
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(\`${col}\`), 0) AS m FROM \`${table}\``,
  );
  return Number(rows[0].m);
}

export async function auditCount() {
  return tableCount("audit_log");
}
