const pool = require("../config/db");

const getAllAssets = async (callback) => {
  const sql = `
    SELECT
      assets.id,
      assets.asset_tag,
      assets.asset_name,
      asset_categories.category_name,
      assets.asset_condition,
      assets.status,
      users.full_name AS assigned_to
    FROM assets

    INNER JOIN asset_categories
      ON assets.category_id = asset_categories.id

    LEFT JOIN asset_assignments
      ON assets.id = asset_assignments.asset_id
      AND asset_assignments.assignment_status = 'Assigned'

    LEFT JOIN users
      ON asset_assignments.staff_id = users.id

    WHERE assets.status != 'Retired'

    ORDER BY assets.asset_name ASC
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getCategories = async (callback) => {
  const sql = `
    SELECT id, category_name
    FROM asset_categories
    WHERE status = 'Active'
    ORDER BY category_name ASC
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getCategoryById = async (id, callback) => {
  const sql = `
    SELECT id, category_name
    FROM asset_categories
    WHERE id = ?
  `;

  try {
    const [rows] = await pool.query(sql, [id]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const registerAsset = async (data, callback) => {
  const sql = `
    INSERT INTO assets (
      asset_tag,
      barcode,
      asset_name,
      category_id,
      brand,
      model,
      serial_number,
      purchase_date,
      asset_condition,
      location
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.query(sql, [
      data.asset_tag,
      data.barcode,
      data.asset_name,
      data.category_id,
      data.brand,
      data.model,
      data.serial_number,
      data.purchase_date,
      data.asset_condition,
      data.location,
    ]);
    callback(null, result.insertId);
  } catch (err) {
    callback(err);
  }
};

const getAssetById = async (id, callback) => {
  const sql = `
    SELECT *
    FROM assets
    WHERE id = ?
  `;

  try {
    const [rows] = await pool.query(sql, [id]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const updateAsset = async (id, data, callback) => {
  const sql = `
    UPDATE assets
    SET
      asset_tag = ?,
      barcode = ?,
      asset_name = ?,
      category_id = ?,
      brand = ?,
      model = ?,
      serial_number = ?,
      purchase_date = ?,
      asset_condition = ?,
      location = ?
    WHERE id = ?
  `;

  try {
    await pool.query(sql, [
      data.asset_tag,
      data.barcode,
      data.asset_name,
      data.category_id,
      data.brand,
      data.model,
      data.serial_number,
      data.purchase_date,
      data.asset_condition,
      data.location,
      id,
    ]);
    callback(null);
  } catch (err) {
    callback(err);
  }
};

const assignAsset = async (assetId, userId, assignedBy, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const checkSql = `
      SELECT status
      FROM assets
      WHERE id = ?
      FOR UPDATE
    `;

    const [checkRows] = await connection.query(checkSql, [assetId]);

    if (checkRows.length === 0) {
      throw new Error("Asset not found.");
    }

    if (checkRows[0].status !== "In Stock") {
      throw new Error(
        `This asset cannot be assigned because its current status is "${checkRows[0].status}".`,
      );
    }

    const assignmentSql = `
      INSERT INTO asset_assignments
      (
        asset_id,
        staff_id,
        assigned_by,
        assigned_date
      )
      VALUES (?, ?, ?, NOW())
    `;

    await connection.query(assignmentSql, [assetId, userId, assignedBy]);

    const updateSql = `
      UPDATE assets
      SET status = 'Assigned'
      WHERE id = ?
    `;

    await connection.query(updateSql, [assetId]);

    await connection.commit();
    callback(null);
  } catch (error) {
    try {
      if (connection) await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    callback(error);
  } finally {
    if (connection) connection.release();
  }
};

const returnAsset = async (assetId, returnedBy, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
        SELECT status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [assetId],
    );

    await connection.query(
      `
        SELECT id
        FROM asset_assignments
        WHERE
          asset_id = ?
          AND assignment_status = 'Assigned'
        FOR UPDATE
      `,
      [assetId],
    );

    const assignmentSql = `
      UPDATE asset_assignments
      SET
        returned_by = ?,
        returned_date = NOW(),
        assignment_status = 'Returned'
      WHERE
        asset_id = ?
        AND assignment_status = 'Assigned'
    `;

    const [assignmentResult] = await connection.query(assignmentSql, [
      returnedBy,
      assetId,
    ]);

    if (assignmentResult.affectedRows === 0) {
      throw new Error("No active assignment found.");
    }

    const assetSql = `
      UPDATE assets
      SET status = 'In Stock'
      WHERE id = ?
    `;

    await connection.query(assetSql, [assetId]);

    await connection.commit();
    callback(null);
  } catch (error) {
    try {
      if (connection) await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    callback(error);
  } finally {
    if (connection) connection.release();
  }
};

const getAssetHistory = async (assetId, callback) => {
  const sql = `
    SELECT
      asset_assignments.id,
      asset_assignments.assigned_date,
      asset_assignments.returned_date,
      asset_assignments.assignment_status,

      staff.full_name AS staff_name,

      admin.full_name AS assigned_by_name

    FROM asset_assignments

    INNER JOIN users staff
      ON asset_assignments.staff_id = staff.id

    INNER JOIN users admin
      ON asset_assignments.assigned_by = admin.id

    WHERE asset_assignments.asset_id = ?

    ORDER BY asset_assignments.assigned_date DESC
  `;

  try {
    const [rows] = await pool.query(sql, [assetId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getAssignedAssets = async (staffId, callback) => {
  const sql = `
    SELECT
      assets.id,
      assets.asset_name
    FROM asset_assignments
    JOIN assets
      ON asset_assignments.asset_id = assets.id
    WHERE asset_assignments.staff_id = ?
      AND asset_assignments.assignment_status = 'Assigned'
    ORDER BY assets.asset_name ASC
  `;

  try {
    const [rows] = await pool.query(sql, [staffId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getDashboardAssetSummary = async (callback) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM assets) AS totalAssets,
      (SELECT COUNT(*) FROM assets WHERE status = 'In Stock') AS inventoryInStock,
      (SELECT COUNT(*) FROM assets WHERE status = 'Assigned') AS assetsAssigned,
      (SELECT COUNT(*) FROM assets WHERE status = 'Under Maintenance') AS assetsUnderMaintenance
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

module.exports = {
  getAllAssets,
  registerAsset,
  getCategories,
  getCategoryById,
  getAssetById,
  updateAsset,
  assignAsset,
  returnAsset,
  getAssetHistory,
  getAssignedAssets,
  getDashboardAssetSummary,
};
