const pool = require("../config/db");
const { isPositiveInteger } = require("../utils/validators");
const { canTransition } = require("../utils/maintenanceTransitions");

const createRequest = async (data, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [assetRows] = await connection.query(
      `
        SELECT id, status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [data.asset_id],
    );

    if (assetRows.length === 0) {
      throw new Error("The selected asset was not found.");
    }

    const assetStatus = assetRows[0].status;

    if (
      ["Under Maintenance", "Out of Service", "Retired"].includes(assetStatus)
    ) {
      throw new Error(
        `This asset cannot have a maintenance request because its current status is "${assetStatus}".`,
      );
    }

    const [assignmentRows] = await connection.query(
      `
        SELECT id
        FROM asset_assignments
        WHERE
          asset_id = ?
          AND staff_id = ?
          AND assignment_status = 'Assigned'
        LIMIT 1
        FOR UPDATE
      `,
      [data.asset_id, data.reported_by],
    );

    if (assignmentRows.length === 0) {
      throw new Error("This asset is not assigned to you.");
    }

    const [openRows] = await connection.query(
      `
        SELECT id
        FROM maintenance
        WHERE
          asset_id = ?
          AND maintenance_status IN ('Pending', 'In Progress', 'Out of Service')
        LIMIT 1
        FOR UPDATE
      `,
      [data.asset_id],
    );

    if (openRows.length > 0) {
      throw new Error(
        "A maintenance request for this asset is already open.",
      );
    }

    const sql = `
      INSERT INTO maintenance
      (
        asset_id,
        reported_by,
        problem_title,
        problem_description,
        priority
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await connection.query(sql, [
      data.asset_id,
      data.reported_by,
      data.problem_title,
      data.problem_description,
      data.priority,
    ]);

    await connection.commit();
    callback(null, result);
  } catch (err) {
    try {
      if (connection) await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    callback(err);
  } finally {
    if (connection) connection.release();
  }
};

const getPendingRequests = async (callback) => {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      users.full_name,
      maintenance.problem_title,
      maintenance.priority,
      maintenance.maintenance_status,
      maintenance.date_reported
    FROM maintenance
    JOIN assets
      ON maintenance.asset_id = assets.id
    JOIN users
      ON maintenance.reported_by = users.id
      WHERE maintenance.maintenance_status = 'Pending'
    ORDER BY maintenance.date_reported DESC
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getTechnicianJobs = async (technicianId, callback) => {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      users.full_name,
      maintenance.problem_title,
      maintenance.priority,
      maintenance.maintenance_status,
      maintenance.date_reported
    FROM maintenance

    JOIN assets
      ON maintenance.asset_id = assets.id

    JOIN users
      ON maintenance.reported_by = users.id

    WHERE
      maintenance.assigned_to = ?
      AND maintenance.maintenance_status = 'In Progress'

    ORDER BY maintenance.date_reported DESC
  `;

  try {
    const [rows] = await pool.query(sql, [technicianId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const acceptRequest = async (maintenanceId, technicianId, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const getAsset = `
      SELECT asset_id
      FROM maintenance
      WHERE id = ?
      FOR UPDATE
    `;

    const [assetRows] = await connection.query(getAsset, [maintenanceId]);

    if (assetRows.length === 0) {
      throw new Error("MAINTENANCE_NOT_FOUND");
    }

    const assetId = assetRows[0].asset_id;

    const [assetLockRows] = await connection.query(
      `
        SELECT status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [assetId],
    );

    if (assetLockRows.length === 0) {
      throw new Error("ASSET_NOT_FOUND");
    }

    const [openRows] = await connection.query(
      `
        SELECT id
        FROM maintenance
        WHERE
          asset_id = ?
          AND maintenance_status IN ('In Progress', 'Out of Service')
          AND id <> ?
        LIMIT 1
        FOR UPDATE
      `,
      [assetId, maintenanceId],
    );

    if (openRows.length > 0) {
      throw new Error(
        "A maintenance request for this asset is already in progress.",
      );
    }

    const updateMaintenance = `
      UPDATE maintenance
      SET
        maintenance_status = 'In Progress',
        assigned_to = ?
      WHERE
        id = ?
        AND maintenance_status = 'Pending'
    `;

    const [updateResult] = await connection.query(updateMaintenance, [
      technicianId,
      maintenanceId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Maintenance request is no longer pending or was not found.",
      );
    }

    const updateAsset = `
      UPDATE assets
      SET status = 'Under Maintenance'
      WHERE id = ?
    `;

    await connection.query(updateAsset, [assetId]);

    await connection.commit();
    callback(null, { currentStatus: "Pending", technicianId });
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

async function completeMaintenance(maintenanceId, technicianId, remarks, callback) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const getMaintenanceQuery = `
      SELECT asset_id, assigned_to, maintenance_status
      FROM maintenance
      WHERE id = ?
      FOR UPDATE
    `;

    const [maintenanceRows] = await connection.query(getMaintenanceQuery, [
      maintenanceId,
    ]);

    if (
      maintenanceRows.length === 0 ||
      maintenanceRows[0].assigned_to !== technicianId ||
      maintenanceRows[0].maintenance_status !== "In Progress"
    ) {
      throw new Error("NOT_OWNER_OR_NOT_IN_PROGRESS");
    }

    const assetId = maintenanceRows[0].asset_id;

    await connection.query(
      `
        SELECT status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [assetId],
    );

    const updateMaintenanceQuery = `
      UPDATE maintenance
      SET
        maintenance_status = 'Completed',
        remarks = ?,
        date_completed = NOW()
      WHERE id = ?
    `;

    const [updateResult] = await connection.query(updateMaintenanceQuery, [
      remarks,
      maintenanceId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error("NOT_OWNER_OR_NOT_IN_PROGRESS");
    }

    const [otherOpenRows] = await connection.query(
      `
        SELECT id
        FROM maintenance
        WHERE
          asset_id = ?
          AND maintenance_status IN ('In Progress', 'Out of Service')
          AND id <> ?
        LIMIT 1
        FOR UPDATE
      `,
      [assetId, maintenanceId],
    );

    if (otherOpenRows.length === 0) {
      const checkAssignmentQuery = `
        SELECT id
        FROM asset_assignments
        WHERE
          asset_id = ?
          AND assignment_status = 'Assigned'
        LIMIT 1
        FOR UPDATE
      `;

      const [assignmentRows] = await connection.query(checkAssignmentQuery, [
        assetId,
      ]);

      const newStatus =
        assignmentRows && assignmentRows.length > 0 ? "Assigned" : "In Stock";

      const updateAssetQuery = `
        UPDATE assets
        SET status = ?
        WHERE
          id = ?
          AND status = 'Under Maintenance'
      `;

      await connection.query(updateAssetQuery, [newStatus, assetId]);
    }

    await connection.commit();
    callback(null, { currentStatus: "In Progress", technicianId });
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
}

async function getMyRequests(staffId, callback) {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      maintenance.problem_title,
      maintenance.priority,
      maintenance.maintenance_status,
      maintenance.date_reported,
      maintenance.date_completed,
      maintenance.remarks
    FROM maintenance
    JOIN assets
      ON maintenance.asset_id = assets.id
    WHERE maintenance.reported_by = ?
    ORDER BY maintenance.date_reported DESC
  `;

  try {
    const [rows] = await pool.query(sql, [staffId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

async function getMaintenanceDetails(maintenanceId, callback) {
  const sql = `
    SELECT
      maintenance.id,
      maintenance.problem_title,
      maintenance.problem_description,
      maintenance.priority,
      maintenance.maintenance_status,
      maintenance.remarks,
      maintenance.date_reported,
      maintenance.date_completed,

      assets.asset_name,
      assets.asset_tag,
      assets.brand,
      assets.model,

      asset_categories.category_name,

      reporter.id AS reported_by_id,
      reporter.full_name AS reported_by,

      maintenance.assigned_to,
      technician.full_name AS technician

    FROM maintenance

    INNER JOIN assets
      ON maintenance.asset_id = assets.id

    LEFT JOIN asset_categories
      ON assets.category_id = asset_categories.id

    LEFT JOIN users reporter
      ON maintenance.reported_by = reporter.id

    LEFT JOIN users technician
      ON maintenance.assigned_to = technician.id

    WHERE maintenance.id = ?
  `;

  try {
    const [rows] = await pool.query(sql, [maintenanceId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

async function getTechnicianDashboard(technicianId, callback) {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      maintenance.problem_title,
      maintenance.priority,
      maintenance.maintenance_status
    FROM maintenance
    INNER JOIN assets
      ON maintenance.asset_id = assets.id
    WHERE maintenance.assigned_to = ?
    ORDER BY maintenance.date_reported DESC
  `;

  try {
    const [rows] = await pool.query(sql, [technicianId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

async function getStaffDashboard(staffId, callback) {
  const requestsSql = `
    SELECT
      maintenance.id,
      maintenance.problem_title,
      maintenance.maintenance_status,
      maintenance.date_reported,
      assets.asset_name
    FROM maintenance

    INNER JOIN assets
      ON maintenance.asset_id = assets.id

    WHERE maintenance.reported_by = ?

    ORDER BY maintenance.date_reported DESC
  `;

  const assetsSql = `
    SELECT COUNT(*) AS assignedAssets
    FROM asset_assignments
    WHERE
      staff_id = ?
      AND assignment_status = 'Assigned'
  `;

  try {
    const [requests] = await pool.query(requestsSql, [staffId]);
    const [assetsResult] = await pool.query(assetsSql, [staffId]);

    callback(null, {
      requests,
      assignedAssets: assetsResult[0].assignedAssets,
    });
  } catch (err) {
    callback(err);
  }
}

const getReportSummary = async (startDate, endDate, callback) => {
  const sql = `
    SELECT
      SUM(CASE WHEN maintenance_status = 'Pending' THEN 1 ELSE 0 END) AS pendingRequests,
      SUM(CASE WHEN maintenance_status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressRequests,
      SUM(CASE WHEN maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completedRequests,
      SUM(CASE WHEN maintenance_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledRequests,
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS highPriority,
      SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) AS mediumPriority,
      SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) AS lowPriority
    FROM maintenance
    WHERE date_reported >= ?
      AND date_reported < ?
  `;

  try {
    const [rows] = await pool.query(sql, [startDate, endDate]);

    const row = rows[0] || {
      pendingRequests: 0,
      inProgressRequests: 0,
      completedRequests: 0,
      cancelledRequests: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    };

    callback(null, {
      pendingRequests: row.pendingRequests || 0,
      inProgressRequests: row.inProgressRequests || 0,
      completedRequests: row.completedRequests || 0,
      cancelledRequests: row.cancelledRequests || 0,
      priorityCounts: {
        high: row.highPriority || 0,
        medium: row.mediumPriority || 0,
        low: row.lowPriority || 0,
      },
    });
  } catch (err) {
    callback(err);
  }
};

const getMaintenanceReport = async (startDate, endDate, callback) => {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      asset_categories.category_name,
      reporter.full_name AS reported_by,
      maintenance.problem_title,
      maintenance.priority,
      technician.full_name AS technician,
      maintenance.maintenance_status,
      maintenance.date_reported
    FROM maintenance
    INNER JOIN assets
      ON maintenance.asset_id = assets.id
    LEFT JOIN asset_categories
      ON assets.category_id = asset_categories.id
    LEFT JOIN users reporter
      ON maintenance.reported_by = reporter.id
    LEFT JOIN users technician
      ON maintenance.assigned_to = technician.id
    WHERE maintenance.date_reported >= ?
      AND maintenance.date_reported < ?
    ORDER BY maintenance.date_reported DESC
    LIMIT 20
  `;

  try {
    const [rows] = await pool.query(sql, [startDate, endDate]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getTechnicianWorkload = async (startDate, endDate, callback) => {
  const sql = `
    SELECT
      users.full_name AS technician_name,

      SUM(
        CASE
          WHEN maintenance.maintenance_status IS NOT NULL
          THEN 1
          ELSE 0
        END
      ) AS assigned_count,

      SUM(
        CASE
          WHEN maintenance.maintenance_status = 'In Progress'
          THEN 1
          ELSE 0
        END
      ) AS in_progress_count,

      SUM(
        CASE
          WHEN maintenance.maintenance_status = 'Completed'
          THEN 1
          ELSE 0
        END
      ) AS completed_count

    FROM maintenance

    INNER JOIN users
      ON maintenance.assigned_to = users.id

    WHERE maintenance.assigned_to IS NOT NULL
      AND maintenance.date_reported >= ?
      AND maintenance.date_reported < ?

    GROUP BY maintenance.assigned_to
    ORDER BY assigned_count DESC
    LIMIT 10
  `;

  try {
    const [rows] = await pool.query(sql, [startDate, endDate]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getRecentActivity = async (startDate, endDate, callback) => {
  const sql = `
    SELECT
      maintenance.maintenance_status,
      assets.asset_name,
      maintenance.problem_title,
      maintenance.date_reported,
      maintenance.date_completed,
      maintenance.date_cancelled,
      technician.full_name AS technician_name

    FROM maintenance

    INNER JOIN assets
      ON maintenance.asset_id = assets.id

    LEFT JOIN users technician
      ON maintenance.assigned_to = technician.id

    WHERE maintenance.date_reported >= ?
      AND maintenance.date_reported < ?

    ORDER BY
      COALESCE(
        maintenance.date_cancelled,
        maintenance.date_completed,
        maintenance.date_reported
      ) DESC

    LIMIT 6
  `;

  try {
    const [rows] = await pool.query(sql, [startDate, endDate]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getAllRecords = async (callback) => {
  const sql = `
    SELECT
      maintenance.id,
      assets.asset_name,
      asset_categories.category_name,
      reporter.full_name AS reported_by,
      maintenance.problem_title,
      maintenance.priority,
      technician.full_name AS technician,
      maintenance.maintenance_status,
      maintenance.date_reported,
      maintenance.date_completed
    FROM maintenance
    INNER JOIN assets
      ON maintenance.asset_id = assets.id
    LEFT JOIN asset_categories
      ON assets.category_id = asset_categories.id
    LEFT JOIN users reporter
      ON maintenance.reported_by = reporter.id
    LEFT JOIN users technician
      ON maintenance.assigned_to = technician.id
    ORDER BY maintenance.date_reported DESC
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

async function cancelRequest(maintenanceId, staffId, callback) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `
        SELECT reported_by, maintenance_status
        FROM maintenance
        WHERE id = ?
        FOR UPDATE
      `,
      [maintenanceId],
    );

    if (
      requestRows.length === 0 ||
      requestRows[0].reported_by !== staffId ||
      !canTransition(requestRows[0].maintenance_status, "Cancelled")
    ) {
      await connection.rollback();
      return callback(null, 0);
    }

    const sql = `
      UPDATE maintenance
      SET
        maintenance_status = 'Cancelled',
        date_cancelled = NOW()
      WHERE
        id = ?
        AND reported_by = ?
        AND maintenance_status = 'Pending'
    `;

    const [result] = await connection.query(sql, [maintenanceId, staffId]);

    await connection.commit();
    callback(null, result.affectedRows);
  } catch (err) {
    try {
      if (connection) await connection.rollback();
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    callback(err);
  } finally {
    if (connection) connection.release();
  }
}

async function syncRejectedAsset(connection, assetId) {
  const getAssetStatusQuery = `
    SELECT status
    FROM assets
    WHERE id = ?
    FOR UPDATE
  `;

  const [assetRows] = await connection.query(getAssetStatusQuery, [assetId]);

  if (assetRows.length === 0) {
    throw new Error("Asset not found.");
  }

  const assetStatus = assetRows[0].status;

  if (assetStatus !== "Under Maintenance") {
    return;
  }

  const [openRows] = await connection.query(
    `
      SELECT id
      FROM maintenance
      WHERE
        asset_id = ?
        AND maintenance_status IN ('In Progress', 'Out of Service')
      LIMIT 1
      FOR UPDATE
    `,
    [assetId],
  );

  if (openRows.length > 0) {
    return;
  }

  const checkAssignmentQuery = `
    SELECT id
    FROM asset_assignments
    WHERE
      asset_id = ?
      AND assignment_status = 'Assigned'
    LIMIT 1
    FOR UPDATE
  `;

  const [assignmentRows] = await connection.query(checkAssignmentQuery, [
    assetId,
  ]);

  const restoredStatus =
    assignmentRows && assignmentRows.length > 0 ? "Assigned" : "In Stock";

  const restoreAssetQuery = `
    UPDATE assets
    SET status = ?
    WHERE
      id = ?
      AND status = 'Under Maintenance'
  `;

  await connection.query(restoreAssetQuery, [restoredStatus, assetId]);
}

async function updateRequestStatus(
  maintenanceId,
  newStatus,
  technicianId,
  actorId,
  callback,
) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const getRequestQuery = `
      SELECT asset_id, maintenance_status
      FROM maintenance
      WHERE id = ?
      FOR UPDATE
    `;

    const [requestRows] = await connection.query(getRequestQuery, [
      maintenanceId,
    ]);

    if (requestRows.length === 0) {
      throw new Error("Maintenance request not found.");
    }

    const assetId = requestRows[0].asset_id;
    const currentStatus = requestRows[0].maintenance_status;

    await connection.query(
      `
        SELECT status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [assetId],
    );

    if (newStatus === "In Progress") {
      if (currentStatus !== "Pending") {
        throw new Error("Only Pending requests can be approved.");
      }

      if (!isPositiveInteger(technicianId)) {
        throw new Error("A valid technician must be selected.");
      }

      const [openRows] = await connection.query(
        `
          SELECT id
          FROM maintenance
          WHERE
            asset_id = ?
            AND maintenance_status IN ('In Progress', 'Out of Service')
            AND id <> ?
          LIMIT 1
          FOR UPDATE
        `,
        [assetId, maintenanceId],
      );

      if (openRows.length > 0) {
        throw new Error(
          "A maintenance request for this asset is already in progress.",
        );
      }

      const updateMaintenanceQuery = `
        UPDATE maintenance
        SET
          maintenance_status = 'In Progress',
          assigned_to = ?
        WHERE id = ?
      `;

      const [updateResult] = await connection.query(
        updateMaintenanceQuery,
        [technicianId, maintenanceId],
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Maintenance request not found.");
      }

      const updateAssetQuery = `
        UPDATE assets
        SET status = 'Under Maintenance'
        WHERE id = ?
      `;

      await connection.query(updateAssetQuery, [assetId]);

      await connection.commit();
      return callback(null, { currentStatus });
    }

    if (!["Rejected", "Out of Service"].includes(newStatus)) {
      throw new Error("Status must be In Progress, Rejected, or Out of Service.");
    }

    if (!canTransition(currentStatus, newStatus)) {
      throw new Error(
        "Only Pending or In Progress requests can be marked Rejected or Out of Service.",
      );
    }

    const updateMaintenanceQuery = `
      UPDATE maintenance
      SET
        maintenance_status = ?,
        date_cancelled = NOW()
      WHERE id = ?
    `;

    const [updateResult] = await connection.query(updateMaintenanceQuery, [
      newStatus,
      maintenanceId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error("Maintenance request not found.");
    }

    if (newStatus === "Rejected") {
      await syncRejectedAsset(connection, assetId);
      await connection.commit();
      return callback(null, { currentStatus });
    }

    const closeAssignmentQuery = `
      UPDATE asset_assignments
      SET
        returned_by = ?,
        returned_date = NOW(),
        assignment_status = 'Returned'
      WHERE
        asset_id = ?
        AND assignment_status = 'Assigned'
    `;

    await connection.query(closeAssignmentQuery, [actorId || null, assetId]);

    const updateAssetQuery = `
      UPDATE assets
      SET status = 'Out of Service'
      WHERE id = ?
    `;

    await connection.query(updateAssetQuery, [assetId]);

    await connection.commit();
    callback(null, { currentStatus });
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
}

async function reassignTechnician(maintenanceId, technicianId, callback) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const getRequestQuery = `
      SELECT asset_id, maintenance_status, assigned_to
      FROM maintenance
      WHERE id = ?
      FOR UPDATE
    `;

    const [requestRows] = await connection.query(getRequestQuery, [
      maintenanceId,
    ]);

    if (
      requestRows.length === 0 ||
      !canTransition(requestRows[0].maintenance_status, "In Progress")
    ) {
      throw new Error(
        "Maintenance request not found or is no longer assignable.",
      );
    }

    const assetId = requestRows[0].asset_id;
    const currentStatus = requestRows[0].maintenance_status;
    const fromTechnicianId = requestRows[0].assigned_to;

    await connection.query(
      `
        SELECT status
        FROM assets
        WHERE id = ?
        FOR UPDATE
      `,
      [assetId],
    );

    const [openRows] = await connection.query(
      `
        SELECT id
        FROM maintenance
        WHERE
          asset_id = ?
          AND maintenance_status IN ('In Progress', 'Out of Service')
          AND id <> ?
        LIMIT 1
        FOR UPDATE
      `,
      [assetId, maintenanceId],
    );

    if (openRows.length > 0) {
      throw new Error(
        "A maintenance request for this asset is already in progress.",
      );
    }

    const updateMaintenanceQuery = `
      UPDATE maintenance
      SET
        maintenance_status = 'In Progress',
        assigned_to = ?
      WHERE id = ?
    `;

    const [updateResult] = await connection.query(updateMaintenanceQuery, [
      technicianId,
      maintenanceId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Maintenance request not found or is no longer assignable.",
      );
    }

    const updateAssetQuery = `
      UPDATE assets
      SET status = 'Under Maintenance'
      WHERE id = ?
    `;

    await connection.query(updateAssetQuery, [assetId]);

    await connection.commit();
    callback(null, { currentStatus, fromTechnicianId });
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
}

async function getLatestMaintenanceForAsset(assetId, callback) {
  const sql = `
    SELECT id
    FROM maintenance
    WHERE asset_id = ?
    ORDER BY id DESC
    LIMIT 1
  `;

  try {
    const [rows] = await pool.query(sql, [assetId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

module.exports = {
  createRequest,
  getPendingRequests,
  getTechnicianJobs,
  getTechnicianDashboard,
  getStaffDashboard,
  getMyRequests,
  getMaintenanceDetails,
  acceptRequest,
  completeMaintenance,
  getReportSummary,
  getMaintenanceReport,
  getTechnicianWorkload,
  getRecentActivity,
  getAllRecords,
  cancelRequest,
  updateRequestStatus,
  reassignTechnician,
  getLatestMaintenanceForAsset,
};
