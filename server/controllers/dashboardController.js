const pool = require("../config/db");

const getDashboardStats = async (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM assets) AS totalAssets,

      (SELECT COUNT(*) FROM users) AS totalUsers,

      (SELECT COUNT(*)
       FROM assets
       WHERE status = 'Under Maintenance') AS assetsUnderMaintenance,

       (SELECT COUNT(*)
       FROM assets
       WHERE status = 'In Stock') AS inventoryInStock,

      (SELECT COUNT(*)
       FROM maintenance
       WHERE maintenance_status = 'Pending') AS pendingRequests
  `;

  try {
    const [rows] = await pool.query(sql);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
};

module.exports = {
  getDashboardStats,
};
