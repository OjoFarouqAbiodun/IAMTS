// csrf.test.js — double-submit CSRF + Origin enforcement (gap G8, cleanly
// re-implemented). Targets POST /change-password with an authenticated Staff
// session. The three rejection cases stop at the CSRF middleware (before the
// route), and the accepted case is given a deliberately WRONG current password
// so it returns 401 without mutating the shared seed user. The user's password
// hash is captured before/after and asserted unchanged — no mutation occurs.

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");

const { pool, makeSession } = require("./helpers.mjs");
const { preflight, findUserByRole, auditCount } = require("./setup.mjs");

let staffUser = null;
let originalHash = null;
let auditBase = 0;

before(async () => {
  await preflight();
  staffUser = await findUserByRole("Staff");
  assert.ok(staffUser, "an Active Staff seed user is required");
  const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [staffUser.id]);
  originalHash = rows[0].password; // captured for no-mutation proof; never printed
  auditBase = await auditCount();
});

after(async () => {
  // Prove the seed user was not mutated by any path in this file.
  if (staffUser && originalHash !== null) {
    const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [staffUser.id]);
    assert.equal(rows[0].password, originalHash, "seed user password hash must be unchanged");
  }
  const delta = (await auditCount()) - auditBase;
  console.log(`[csrf.test] audit_log rows appended this file: ${delta}`);
  await pool.end();
});

test("POST /change-password with no CSRF header -> 403", async () => {
  const s = makeSession();
  assert.equal(await s.login(staffUser.email), 200);
  const { status, data } = await s.req(
    "POST",
    "/change-password",
    { currentPassword: "irrelevant-wrong", newPassword: "IrrelevantNew123!" },
    { sendCsrf: false },
  );
  assert.equal(status, 403);
  assert.match(data?.message || "", /CSRF token validation failed/);
});

test("POST /change-password with a wrong CSRF token -> 403", async () => {
  const s = makeSession();
  assert.equal(await s.login(staffUser.email), 200);
  const { status, data } = await s.req(
    "POST",
    "/change-password",
    { currentPassword: "irrelevant-wrong", newPassword: "IrrelevantNew123!" },
    { csrfValue: "not-the-real-token" },
  );
  assert.equal(status, 403);
  assert.match(data?.message || "", /CSRF token validation failed/);
});

test("POST /change-password from a cross-origin request -> 403", async () => {
  const s = makeSession();
  assert.equal(await s.login(staffUser.email), 200);
  // Valid CSRF token is sent, but the Origin host mismatches -> origin check
  // fires first and rejects.
  const { status, data } = await s.req(
    "POST",
    "/change-password",
    { currentPassword: "irrelevant-wrong", newPassword: "IrrelevantNew123!" },
    { origin: "http://evil.example" },
  );
  assert.equal(status, 403);
  assert.match(data?.message || "", /Invalid request origin/);
});

test("POST /change-password with valid CSRF reaches the controller (401 on wrong current password, no mutation)", async () => {
  const s = makeSession();
  assert.equal(await s.login(staffUser.email), 200);
  // Correct origin + matching double-submit token -> CSRF passes. Wrong current
  // password -> 401 from the controller, so nothing is changed.
  const { status, data } = await s.req("POST", "/change-password", {
    currentPassword: "deliberately-wrong-current",
    newPassword: "SomeValidNew123!",
  });
  assert.equal(status, 401);
  assert.match(data?.message || "", /Current password is incorrect/);
});
