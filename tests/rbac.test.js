// rbac.test.js — Role-based access control enforcement.
// Verifies that Staff and Technician users receive HTTP 403 when accessing
// routes restricted to other roles. Uses existing seed users (no fixture
// creation/cleanup needed).

const test = require("node:test");
const assert = require("node:assert/strict");

const { after } = require("node:test");
const { BASE, makeSession, pool } = require("./helpers.mjs");
const { preflight } = require("./setup.mjs");

const SEED_PASSWORD = "Password123!";

let staffSession = null;
let techSession = null;

test.before(async () => {
  await preflight();

  staffSession = makeSession();
  await staffSession.login("aogunleye@iamts.com", SEED_PASSWORD);

  techSession = makeSession();
  await techSession.login("sadebayo@iamts.com", SEED_PASSWORD);
});

after(async () => {
  await pool.end();
});

// --- Staff denied Admin-only API routes ---

test("Staff denied GET /assets (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/assets");
  assert.equal(status, 403);
});

test("Staff denied POST /assets/register (Admin-only)", async () => {
  const { status } = await staffSession.req("POST", "/assets/register", {
    asset_tag: "RBAC-TEST-FORbidden",
    name: "Should Fail",
    category_id: 1,
  });
  assert.equal(status, 403);
});

test("Staff denied GET /users (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/users");
  assert.equal(status, 403);
});

test("Staff denied POST /users (Admin-only)", async () => {
  const { status } = await staffSession.req("POST", "/users", {
    full_name: "Should Fail",
    email: "rbac-fail@test.com",
    password: "TestPass123!",
    role: "Staff",
    department: "Test",
  });
  assert.equal(status, 403);
});

test("Staff denied GET /maintenance/pending (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/maintenance/pending");
  assert.equal(status, 403);
});

test("Staff denied GET /maintenance/all (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/maintenance/all");
  assert.equal(status, 403);
});

test("Staff denied PATCH /maintenance/1/accept (Admin-only)", async () => {
  const { status } = await staffSession.req("PATCH", "/maintenance/1/accept");
  assert.equal(status, 403);
});

test("Staff denied PATCH /maintenance/1/status (Admin-only)", async () => {
  const { status } = await staffSession.req("PATCH", "/maintenance/1/status", {
    status: "In Progress",
  });
  assert.equal(status, 403);
});

test("Staff denied GET /dashboard/stats (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/dashboard/stats");
  assert.equal(status, 403);
});

test("Staff denied GET /reports/data (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/reports/data");
  assert.equal(status, 403);
});

test("Staff denied GET /audit (Admin-only)", async () => {
  const { status } = await staffSession.req("GET", "/audit");
  assert.equal(status, 403);
});

test("Staff denied GET /maintenance/technician (Technician-only)", async () => {
  const { status } = await staffSession.req("GET", "/maintenance/technician");
  assert.equal(status, 403);
});

test("Staff denied GET /maintenance/technician/dashboard (Technician-only)", async () => {
  const { status } = await staffSession.req(
    "GET",
    "/maintenance/technician/dashboard",
  );
  assert.equal(status, 403);
});

// --- Technician denied Admin-only API routes ---

test("Technician denied GET /assets (Admin-only)", async () => {
  const { status } = await techSession.req("GET", "/assets");
  assert.equal(status, 403);
});

test("Technician denied GET /users (Admin-only)", async () => {
  const { status } = await techSession.req("GET", "/users");
  assert.equal(status, 403);
});

test("Technician denied POST /assets/register (Admin-only)", async () => {
  const { status } = await techSession.req("POST", "/assets/register", {
    asset_tag: "RBAC-TEST-FORbidden",
    name: "Should Fail",
    category_id: 1,
  });
  assert.equal(status, 403);
});

test("Technician denied PATCH /maintenance/1/accept (Admin-only)", async () => {
  const { status } = await techSession.req(
    "PATCH",
    "/maintenance/1/accept",
  );
  assert.equal(status, 403);
});

test("Technician denied PATCH /maintenance/1/status (Admin-only)", async () => {
  const { status } = await techSession.req("PATCH", "/maintenance/1/status", {
    status: "Rejected",
  });
  assert.equal(status, 403);
});

test("Technician denied GET /dashboard/stats (Admin-only)", async () => {
  const { status } = await techSession.req("GET", "/dashboard/stats");
  assert.equal(status, 403);
});

test("Technician denied GET /audit (Admin-only)", async () => {
  const { status } = await techSession.req("GET", "/audit");
  assert.equal(status, 403);
});

test("Technician denied POST /maintenance (Staff-only)", async () => {
  const { status } = await techSession.req("POST", "/maintenance", {
    asset_id: 1,
    problem_title: "Should Fail",
    description: "RBAC test",
  });
  assert.equal(status, 403);
});

test("Technician denied GET /maintenance/my-requests — returns own (empty) data", async () => {
  const { status } = await techSession.req("GET", "/maintenance/my-requests");
  // This route has no checkRole — any authenticated user can call it.
  // It filters by req.user.id, so a Technician gets their own (empty) list.
  // This is NOT a 403; it's 200 with empty data. Document as expected behavior.
  assert.equal(status, 200);
});

// --- Technician CANNOT complete another Technician's job (object-level) ---

test("Technician denied complete on non-In-Progress maintenance (object-level)", async () => {
  // All seed maintenance is "Completed" (terminal). Complete requires
  // "In Progress" status AND assigned_to match. Either violation yields 403.
  // Must include remarks to pass the controller's input validation.
  const { status } = await techSession.req(
    "PATCH",
    "/maintenance/1/complete",
    { remarks: "Should be rejected" },
  );
  assert.equal(status, 403);
});

// --- Staff can access own-scoped routes ---

test("Staff allowed GET /maintenance/my-requests (own-scoped)", async () => {
  const { status } = await staffSession.req("GET", "/maintenance/my-requests");
  assert.equal(status, 200);
});

test("Staff allowed GET /my-assets (own-scoped)", async () => {
  const { status } = await staffSession.req("GET", "/my-assets");
  assert.equal(status, 200);
});

test("Staff allowed GET /asset-categories (any-authenticated)", async () => {
  const { status } = await staffSession.req("GET", "/asset-categories");
  assert.equal(status, 200);
});

test("Staff allowed GET /me (any-authenticated)", async () => {
  const { status } = await staffSession.req("GET", "/me");
  assert.equal(status, 200);
});

test("Staff allowed GET /notifications (own-scoped)", async () => {
  const { status } = await staffSession.req("GET", "/notifications");
  assert.equal(status, 200);
});

// --- Technician can access own-scoped routes ---

test("Technician allowed GET /maintenance/technician (own-scoped)", async () => {
  const { status } = await techSession.req("GET", "/maintenance/technician");
  assert.equal(status, 200);
});

test("Technician allowed GET /me (any-authenticated)", async () => {
  const { status } = await techSession.req("GET", "/me");
  assert.equal(status, 200);
});

test("Technician allowed GET /asset-categories (any-authenticated)", async () => {
  const { status } = await techSession.req("GET", "/asset-categories");
  assert.equal(status, 200);
});

// --- Unauthenticated access rejected ---

test("Unauthenticated GET /assets returns 401", async () => {
  const resp = await fetch(`${BASE}/assets`);
  assert.equal(resp.status, 401);
});

test("Unauthenticated GET /users returns 401", async () => {
  const resp = await fetch(`${BASE}/users`);
  assert.equal(resp.status, 401);
});

test("Unauthenticated GET /dashboard/stats returns 401", async () => {
  const resp = await fetch(`${BASE}/dashboard/stats`);
  assert.equal(resp.status, 401);
});
