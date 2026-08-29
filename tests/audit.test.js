// audit.test.js — audit-log read API: pagination boundaries, filter validation,
// response shape (gap G12), and a no-secrets scan of recent rows. READ-ONLY:
// creates no fixtures and mutates nothing. audit_log is shared with production
// and is never written or deleted by this file.

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");

const { pool, makeSession, findSecrets } = require("./helpers.mjs");
const { preflight, auditCount } = require("./setup.mjs");

const SEED_ADMIN = "kalagbala@iamts.com";
let admin = null;
let auditBase = 0;

before(async () => {
  await preflight();
  admin = makeSession();
  assert.equal(await admin.login(SEED_ADMIN), 200, "admin login should succeed");
  auditBase = await auditCount();
});

after(async () => {
  const delta = (await auditCount()) - auditBase;
  console.log(`[audit.test] audit_log rows appended this file: ${delta} (read-only file)`);
  await pool.end();
});

test("limit above the max (101) -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?limit=101");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Limit must be between 1 and 100/);
});

test("limit below the min (0) -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?limit=0");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Limit must be between 1 and 100/);
});

test("non-numeric limit -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?limit=abc");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid pagination parameters/);
});

test("page below 1 (0) -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?page=0");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid pagination parameters/);
});

test("non-numeric page -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?page=abc");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid pagination parameters/);
});

test("invalid filter value -> 400", async () => {
  const { status, data } = await admin.req("GET", "/audit?category=BOGUS");
  assert.equal(status, 400);
  assert.match(data?.message || "", /Invalid filter/);
});

test("valid pagination returns the documented shape and honors limit", async () => {
  const { status, data } = await admin.req("GET", "/audit?page=1&limit=5");
  assert.equal(status, 200);
  assert.ok(data && typeof data === "object");
  for (const key of ["total", "page", "pages", "limit", "rows"]) {
    assert.ok(key in data, `response missing key '${key}'`);
  }
  assert.ok(Array.isArray(data.rows), "rows must be an array");
  assert.ok(data.rows.length <= 5, "rows must not exceed the requested limit");
  assert.equal(Number(data.limit), 5);
  assert.equal(Number(data.page), 1);
  const total = Number(data.total);
  if (total > 0) {
    assert.equal(Number(data.pages), Math.ceil(total / 5), "pages must equal ceil(total/limit)");
  } else {
    assert.ok(Number(data.pages) >= 0);
  }
});

test("omitting limit falls back to the default of 50", async () => {
  const { status, data } = await admin.req("GET", "/audit?page=1");
  assert.equal(status, 200);
  assert.equal(Number(data.limit), 50);
});

test("recent audit rows contain no secrets (via API and direct DB read)", async () => {
  const offenders = [];

  // Via the API (what an admin actually sees).
  const { status, data } = await admin.req("GET", "/audit?page=1&limit=50");
  assert.equal(status, 200);
  for (const row of data.rows || []) {
    const reasons = findSecrets(row);
    if (reasons.length) offenders.push(`api#${row.id}: ${reasons.join(",")}`);
  }

  // Via a direct read of the latest rows (covers columns the API may omit).
  const [rows] = await pool.query(
    "SELECT id, category, action, outcome, detail, actor_role, target_type, target_id FROM audit_log ORDER BY id DESC LIMIT 50",
  );
  for (const row of rows) {
    const reasons = findSecrets(row);
    if (reasons.length) offenders.push(`db#${row.id}: ${reasons.join(",")}`);
  }

  assert.equal(offenders.length, 0, `secrets found in audit rows: ${offenders.join("; ")}`);
});
