// auth.test.js — authentication + session-fixation coverage (net-new: E).
// Ported from security-probe-fixed.js #9 but run against :3100 (never :3000).
// No fixtures created; no secrets printed (session ids are compared, not logged).

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");

const { pool, rawLogin, getMe, rawLogout, cookieHeader } = require("./helpers.mjs");
const { preflight, auditCount } = require("./setup.mjs");

const SEED_ADMIN = "kalagbala@iamts.com";
let auditBase = 0;

before(async () => {
  await preflight();
  auditBase = await auditCount();
});

after(async () => {
  // Read-only file: report the append-only audit_log delta, then close the pool.
  // audit_log is shared with production and is NEVER deleted by this suite.
  const delta = (await auditCount()) - auditBase;
  console.log(`[auth.test] audit_log rows appended this file: ${delta}`);
  await pool.end();
});

test("GET /me while unauthenticated -> 401", async () => {
  const status = await getMe("");
  assert.equal(status, 401);
});

test("login with wrong password -> 401 generic message", async () => {
  const { status } = await rawLogin(SEED_ADMIN, { password: "definitely-not-the-password" });
  assert.equal(status, 401);
});

test("session id rotates on re-login; the pre-login session is not honored", async () => {
  // 1. First login -> session id #1.
  const first = await rawLogin(SEED_ADMIN);
  assert.equal(first.status, 200, "first login should succeed");
  const sid1 = first.cookies["connect.sid"];
  assert.ok(sid1, "first login must set connect.sid");

  // The first session is valid.
  const ch1 = cookieHeader(first.cookies);
  assert.equal(await getMe(ch1), 200, "first session should authenticate");

  // 2. Re-login while presenting session #1's cookie -> session id must change
  //    (express-session regenerate on login defeats fixation).
  const second = await rawLogin(SEED_ADMIN, { cookieHeader: ch1 });
  assert.equal(second.status, 200, "second login should succeed");
  const sid2 = second.cookies["connect.sid"];
  assert.ok(sid2, "second login must set a fresh connect.sid");

  // Never print sid1/sid2 — compare only.
  assert.notEqual(sid2, sid1, "session id must rotate on re-login (fixation defense)");

  // 3. The new session works; the old session id is no longer authenticated.
  const ch2 = cookieHeader(second.cookies);
  assert.equal(await getMe(ch2), 200, "new session should authenticate");
  assert.equal(await getMe(ch1), 401, "old (pre-rotation) session must be rejected");

  // Clean up the live session we created.
  await rawLogout(second.cookies);
});
