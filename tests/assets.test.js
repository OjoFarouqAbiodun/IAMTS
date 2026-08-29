// assets.test.js — concurrent double-assignment protection (net-new: C; gap G7).
// There is NO DB unique constraint on asset_assignments; the guarantee comes
// from SELECT ... FOR UPDATE + an 'In Stock' status gate in Asset.assignAsset.
// We create one fresh In-Stock asset, fire two concurrent POST /assets/assign
// for it, and assert exactly one 200 + one 400, with exactly one Assigned row.
// The asset and its single assignment are deleted by exact id in after().

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");
const crypto = require("node:crypto");

const { BASE, pool, makeSession } = require("./helpers.mjs");
const { preflight, findUserByRole, findActiveCategoryId, tableCount, auditCount } = require("./setup.mjs");

const SEED_ADMIN = "kalagbala@iamts.com";

let admin = null;
let assetId = null;
let staffId = null;
let assetsBase = 0;
let assignBase = 0;
let auditBase = 0;

before(async () => {
  await preflight();
  assetsBase = await tableCount("assets");
  assignBase = await tableCount("asset_assignments");
  auditBase = await auditCount();

  admin = makeSession();
  assert.equal(await admin.login(SEED_ADMIN), 200, "admin login should succeed");

  const staff = await findUserByRole("Staff");
  assert.ok(staff, "an Active Staff user is required as the assignee");
  staffId = staff.id;
console.log("ASSET TEST STAFF:", staff);
console.log("ASSET TEST STAFF ID:", staffId);

  const categoryId = await findActiveCategoryId();
  assert.ok(categoryId, "an asset category is required for the FK");

  const tag = `S11-${crypto.randomBytes(4).toString("hex")}`;
  const [ins] = await pool.query(
    "INSERT INTO assets (asset_tag, asset_name, category_id, status) VALUES (?, ?, ?, 'In Stock')",
    [tag, "S11 Concurrency Fixture", categoryId],
  );
  assetId = ins.insertId;
});

after(async () => {
  try {
    if (assetId) {
      await pool.query("DELETE FROM asset_assignments WHERE asset_id = ?", [assetId]);
      await pool.query("DELETE FROM assets WHERE id = ?", [assetId]);

      const [a] = await pool.query("SELECT id FROM assets WHERE id = ?", [assetId]);
      assert.equal(a.length, 0, "fixture asset must be deleted");
      const [aa] = await pool.query(
        "SELECT id FROM asset_assignments WHERE asset_id = ?",
        [assetId],
      );
      assert.equal(aa.length, 0, "fixture assignment rows must be deleted");
    }
    assert.equal(await tableCount("assets"), assetsBase, "assets count must be restored");
    assert.equal(
      await tableCount("asset_assignments"),
      assignBase,
      "asset_assignments count must be restored",
    );
    const delta = (await auditCount()) - auditBase;
    console.log(`[assets.test] audit_log rows appended this file: ${delta}`);
  } finally {
    await pool.end();
  }
});

// Fire a raw assign request with fixed headers so two can run concurrently
// without racing on the session's cookie jar.
function assign() {
  return fetch(`${BASE}/assets/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: BASE,
      Cookie: admin.cookie,
      "x-csrf-token": admin.csrf,
    },
    body: JSON.stringify({ asset_id: assetId, user_id: staffId }),
  }).then(async (resp) => {
    let data = null;
    try {
      data = await resp.json();
    } catch {
      /* ignore */
    }
    return { status: resp.status, data };
  });
}

test("two concurrent assignments of one asset yield exactly one success and one rejection", async () => {
  const [r1, r2] = await Promise.all([assign(), assign()]);
  const statuses = [r1.status, r2.status].sort((a, b) => a - b);
console.log("ASSIGN RESPONSE 1:", r1.status, JSON.stringify(r1.data));
console.log("ASSIGN RESPONSE 2:", r2.status, JSON.stringify(r2.data));  
assert.deepEqual(statuses, [200, 400], `expected [200,400], got ${JSON.stringify(statuses)}`);

  const loser = r1.status === 400 ? r1 : r2;
  assert.match(
    loser.data?.message || "",
    /^This asset cannot be assigned because its current status is/,
  );

  // Exactly one Assigned assignment row exists for the asset...
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM asset_assignments WHERE asset_id = ? AND assignment_status = 'Assigned'",
    [assetId],
  );
  assert.equal(Number(rows[0].n), 1, "exactly one Assigned row must exist");

  // ...and the asset is now Assigned.
  const [assetRows] = await pool.query("SELECT status FROM assets WHERE id = ?", [assetId]);
  assert.equal(assetRows[0].status, "Assigned");
});
