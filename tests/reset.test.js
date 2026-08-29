// reset.test.js — password-reset token expiry + single-use (net-new: A, B;
// gaps G3, G4). Creates a throwaway Active Staff user and inserts password_resets
// rows directly, using the SHA-256 hash of locally-generated raw tokens (exactly
// how the app hashes them). Raw tokens and hashes are never printed. All fixtures
// are deleted by exact id/user_id in a finally-style after() hook.

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");
const crypto = require("node:crypto");

const { BASE, pool, sha256hex, hashPassword, comparePassword } = require("./helpers.mjs");
const { preflight, tableCount, auditCount } = require("./setup.mjs");

const SEED_PASSWORD = process.env.STAGING_TEST_PASSWORD || "Password123!";
const NEW_PASSWORD = "NewValidPass123!";
const REUSE_PASSWORD = "SecondNewPass456!";

// Locally-generated raw tokens (never stored raw by the app, never printed here).
const rawExpired = crypto.randomBytes(32).toString("base64url");
const rawValid = crypto.randomBytes(32).toString("base64url");
const rawUnknown = crypto.randomBytes(32).toString("base64url");

let userId = null;
let usersBase = 0;
let resetsBase = 0;
let auditBase = 0;

before(async () => {
  await preflight();
  usersBase = await tableCount("users");
  resetsBase = await tableCount("password_resets");
  auditBase = await auditCount();

  const email = `s11-reset-${crypto.randomBytes(6).toString("hex")}@iamts.test`;
  const hashed = await hashPassword(SEED_PASSWORD);
  const [ins] = await pool.query(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'Staff', 'Active')",
    ["S11 Reset Fixture", email, hashed],
  );
  userId = ins.insertId;

  // Expired token (past expiry) and valid token (30 min out); both unused.
  await pool.query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 HOUR), 0)",
    [userId, sha256hex(rawExpired)],
  );
  await pool.query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)",
    [userId, sha256hex(rawValid)],
  );
});

after(async () => {
  try {
    if (userId) {
      await pool.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
      await pool.query("DELETE FROM users WHERE id = ?", [userId]);

      const [u] = await pool.query("SELECT id FROM users WHERE id = ?", [userId]);
      assert.equal(u.length, 0, "throwaway user must be deleted");
      const [pr] = await pool.query(
        "SELECT id FROM password_resets WHERE user_id = ?",
        [userId],
      );
      assert.equal(pr.length, 0, "fixture password_resets rows must be deleted");
    }
    assert.equal(await tableCount("users"), usersBase, "users count must be restored");
    assert.equal(
      await tableCount("password_resets"),
      resetsBase,
      "password_resets count must be restored",
    );
    const delta = (await auditCount()) - auditBase;
    console.log(`[reset.test] audit_log rows appended this file: ${delta}`);
  } finally {
    await pool.end();
  }
});

async function resetPassword(token, newPassword) {
  const resp = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: BASE },
    body: JSON.stringify({ token, newPassword }),
  });
  let data = null;
  try {
    data = await resp.json();
  } catch {
    /* ignore */
  }
  return { status: resp.status, data };
}

async function currentHash() {
  const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
  return rows[0].password;
}

test("expired reset token is rejected (400) and the password is unchanged", async () => {
  const before = await currentHash();
  const { status, data } = await resetPassword(rawExpired, NEW_PASSWORD);
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid or expired reset token/);
  assert.equal(await currentHash(), before, "password must not change on an expired token");
});

test("valid reset token succeeds once, then cannot be reused (single-use)", async () => {
  // First use: succeeds and actually changes the password.
  const first = await resetPassword(rawValid, NEW_PASSWORD);
  assert.equal(first.status, 200);
  assert.match(first.data?.message || "", /Password reset successful/);
  assert.equal(
    await comparePassword(NEW_PASSWORD, await currentHash()),
    true,
    "password should now match the new password",
  );

  // Second use of the same token: rejected, and the password does NOT change
  // to the second candidate.
  const second = await resetPassword(rawValid, REUSE_PASSWORD);
  assert.equal(second.status, 400);
  assert.match(second.data?.message || "", /Invalid or expired reset token/);
  const hashNow = await currentHash();
  assert.equal(await comparePassword(NEW_PASSWORD, hashNow), true, "still the first new password");
  assert.equal(
    await comparePassword(REUSE_PASSWORD, hashNow),
    false,
    "reuse must not apply the second password",
  );
});

test("an unknown reset token is rejected (400)", async () => {
  const { status, data } = await resetPassword(rawUnknown, NEW_PASSWORD);
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid or expired reset token/);
});
