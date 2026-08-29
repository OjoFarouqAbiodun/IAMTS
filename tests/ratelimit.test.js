// ratelimit.test.js — forgot-password rate limiting (net-new: D; gap G11 extension).
// The per-email forgotPasswordLimiter is max 5 / 15 min with NO
// skipSuccessfulRequests, so requests 1-5 return 200 (generic) and the 6th
// returns 429. Uses a unique, non-existent email each run: no user matches, so
// the controller inserts NO password_resets row (verified via a baseline count).

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");
const crypto = require("node:crypto");

const { BASE, pool } = require("./helpers.mjs");
const { preflight, tableCount, auditCount } = require("./setup.mjs");

// Unique per run so the per-email limiter window never carries across the two
// idempotency runs. Non-existent + .test TLD so it can never match a real user.
const RL_EMAIL = `s11-rl-${crypto.randomBytes(6).toString("hex")}@iamts.test`;

let resetsBase = 0;
let auditBase = 0;

before(async () => {
  await preflight();
  resetsBase = await tableCount("password_resets");
  auditBase = await auditCount();
});

after(async () => {
  // No fixtures were created (unknown email -> no insert). Assert that holds,
  // then report the append-only audit delta and close the pool.
  const resetsNow = await tableCount("password_resets");
  assert.equal(
    resetsNow,
    resetsBase,
    "forgot-password for an unknown email must not create password_resets rows",
  );
  const delta = (await auditCount()) - auditBase;
  console.log(`[ratelimit.test] audit_log rows appended this file: ${delta}`);
  await pool.end();
});

async function forgot(email) {
  const resp = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: BASE },
    body: JSON.stringify({ email }),
  });
  try {
    await resp.json();
  } catch {
    /* ignore body */
  }
  return resp.status;
}

test("first 5 forgot-password requests for one email are accepted (200)", async () => {
  for (let i = 1; i <= 5; i++) {
    const status = await forgot(RL_EMAIL);
    assert.equal(status, 200, `request #${i} should be 200, got ${status}`);
  }
});

test("the 6th forgot-password request for the same email is rate-limited (429)", async () => {
  const status = await forgot(RL_EMAIL);
  assert.equal(status, 429, `6th request should be 429, got ${status}`);
});
