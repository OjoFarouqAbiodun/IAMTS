// maintenance.test.js — maintenance ownership enforcement (net-new).
// Staff B cannot cancel Staff A's request; Tech B cannot complete Tech A's job.
// Creates throwaway Staff/Technician users, asset, and maintenance request;
// all cleaned up in after() by exact ID; baseline counts verified.

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");
const crypto = require("node:crypto");

const { BASE, pool, makeSession, hashPassword } = require("./helpers.mjs");
const { preflight, findActiveCategoryId, tableCount, auditCount } = require("./setup.mjs");

const SEED_ADMIN = "kalagbala@iamts.com";
const SEED_PASSWORD = "Password123!";

const createdUserIds = [];
const createdAssetIds = [];
const createdMaintenanceIds = [];

let staffAEmail = null;
let staffBEmail = null;
let techAEmail = null;
let techBEmail = null;

let staffAId = null;
let staffBId = null;
let techAId = null;
let techBId = null;
let assetId = null;
let maintenanceId = null;

let usersBase = 0;
let assetsBase = 0;
let assignBase = 0;
let maintenanceBase = 0;
let auditBase = 0;

before(async () => {
  await preflight();

  usersBase = await tableCount("users");
  assetsBase = await tableCount("assets");
  assignBase = await tableCount("asset_assignments");
  maintenanceBase = await tableCount("maintenance");
  auditBase = await auditCount();

  const hashed = await hashPassword(SEED_PASSWORD);

  staffAEmail = `s11-mA-${crypto.randomBytes(4).toString("hex")}@iamts.test`;
  staffBEmail = `s11-mB-${crypto.randomBytes(4).toString("hex")}@iamts.test`;
  techAEmail = `s11-tA-${crypto.randomBytes(4).toString("hex")}@iamts.test`;
  techBEmail = `s11-tB-${crypto.randomBytes(4).toString("hex")}@iamts.test`;

  const [insA] = await pool.query(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'Staff', 'Active')",
    ["S11 StaffA", staffAEmail, hashed],
  );
  staffAId = insA.insertId;
  createdUserIds.push(staffAId);

  const [insB] = await pool.query(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'Staff', 'Active')",
    ["S11 StaffB", staffBEmail, hashed],
  );
  staffBId = insB.insertId;
  createdUserIds.push(staffBId);

  const [insTA] = await pool.query(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'Technician', 'Active')",
    ["S11 TechA", techAEmail, hashed],
  );
  techAId = insTA.insertId;
  createdUserIds.push(techAId);

  const [insTB] = await pool.query(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'Technician', 'Active')",
    ["S11 TechB", techBEmail, hashed],
  );
  techBId = insTB.insertId;
  createdUserIds.push(techBId);

  const categoryId = await findActiveCategoryId();
  assert.ok(categoryId, "an asset category is required");

  const tag = `S11-${crypto.randomBytes(4).toString("hex")}`;
  const [insAsset] = await pool.query(
    "INSERT INTO assets (asset_tag, asset_name, category_id, status) VALUES (?, ?, ?, 'In Stock')",
    [tag, "S11 Maintenance Ownership Fixture", categoryId],
  );
  assetId = insAsset.insertId;
  createdAssetIds.push(assetId);

  const admin = makeSession();
  assert.equal(await admin.login(SEED_ADMIN), 200, "admin login should succeed");

  const { status: assignStatus } = await admin.req("POST", "/assets/assign", {
    asset_id: assetId,
    user_id: staffAId,
  });
  assert.equal(assignStatus, 200, "asset assignment should succeed");

  const staffA = makeSession();
  assert.equal(await staffA.login(staffAEmail), 200, "staff A login should succeed");

  const { status: reqStatus } = await staffA.req("POST", "/maintenance", {
    asset_id: assetId,
    problem_title: "S11 Ownership Test Issue",
    problem_description: "Fixture for ownership enforcement test",
    priority: "Low",
  });
  assert.equal(reqStatus, 200, "maintenance request creation should succeed");

  const [maintRows] = await pool.query(
    "SELECT id FROM maintenance WHERE asset_id = ? AND reported_by = ? ORDER BY id DESC LIMIT 1",
    [assetId, staffAId],
  );
  assert.ok(maintRows.length > 0, "maintenance request must exist in DB");
  maintenanceId = maintRows[0].id;
  createdMaintenanceIds.push(maintenanceId);
});

after(async () => {
  try {
    for (const mid of createdMaintenanceIds) {
      await pool.query("DELETE FROM maintenance WHERE id = ?", [mid]);
    }
    for (const aid of createdAssetIds) {
      await pool.query("DELETE FROM asset_assignments WHERE asset_id = ?", [aid]);
    }
    for (const aid of createdAssetIds) {
      await pool.query("DELETE FROM assets WHERE id = ?", [aid]);
    }
    for (const uid of createdUserIds) {
      await pool.query("DELETE FROM notifications WHERE user_id = ?", [uid]);
      await pool.query("DELETE FROM users WHERE id = ?", [uid]);
    }

    for (const uid of createdUserIds) {
      const [u] = await pool.query("SELECT id FROM users WHERE id = ?", [uid]);
      assert.equal(u.length, 0, `throwaway user ${uid} must be deleted`);
    }
    for (const aid of createdAssetIds) {
      const [a] = await pool.query("SELECT id FROM assets WHERE id = ?", [aid]);
      assert.equal(a.length, 0, `throwaway asset ${aid} must be deleted`);
    }
    for (const mid of createdMaintenanceIds) {
      const [m] = await pool.query("SELECT id FROM maintenance WHERE id = ?", [mid]);
      assert.equal(m.length, 0, `throwaway maintenance ${mid} must be deleted`);
    }

    assert.equal(await tableCount("users"), usersBase, "users count must be restored");
    assert.equal(await tableCount("assets"), assetsBase, "assets count must be restored");
    assert.equal(
      await tableCount("asset_assignments"),
      assignBase,
      "asset_assignments count must be restored",
    );
    assert.equal(
      await tableCount("maintenance"),
      maintenanceBase,
      "maintenance count must be restored",
    );

    const delta = (await auditCount()) - auditBase;
    console.log(`[maintenance.test] audit_log rows appended this file: ${delta}`);
  } finally {
    await pool.end();
  }
});

test("Staff B cannot cancel Staff A's maintenance request (400)", async () => {
  const staffB = makeSession();
  assert.equal(await staffB.login(staffBEmail), 200, "staff B login should succeed");

  const { status } = await staffB.req("PATCH", `/maintenance/${maintenanceId}/cancel`, {});
  assert.equal(status, 400, "non-owner cancel must be rejected");

  const [rows] = await pool.query(
    "SELECT maintenance_status FROM maintenance WHERE id = ?",
    [maintenanceId],
  );
  assert.equal(rows[0].maintenance_status, "Pending", "request must still be Pending");
});

test("admin approves request and assigns to Tech A", async () => {
  const admin = makeSession();
  assert.equal(await admin.login(SEED_ADMIN), 200, "admin login should succeed");

  const { status } = await admin.req("PATCH", `/maintenance/${maintenanceId}/status`, {
    status: "In Progress",
    technician_id: techAId,
  });
  assert.equal(status, 200, "admin approval should succeed");

  const [rows] = await pool.query(
    "SELECT maintenance_status, assigned_to FROM maintenance WHERE id = ?",
    [maintenanceId],
  );
  assert.equal(rows[0].maintenance_status, "In Progress", "request must be In Progress");
  assert.equal(Number(rows[0].assigned_to), techAId, "must be assigned to Tech A");
});

test("Technician B cannot complete Technician A's job (403)", async () => {
  const techB = makeSession();
  assert.equal(await techB.login(techBEmail), 200, "tech B login should succeed");

  const { status } = await techB.req("PATCH", `/maintenance/${maintenanceId}/complete`, {
    remarks: "Attempting to complete another tech's job",
  });
  assert.equal(status, 403, "non-owner complete must be rejected");

  const [rows] = await pool.query(
    "SELECT maintenance_status FROM maintenance WHERE id = ?",
    [maintenanceId],
  );
  assert.equal(
    rows[0].maintenance_status,
    "In Progress",
    "request must still be In Progress",
  );
});
