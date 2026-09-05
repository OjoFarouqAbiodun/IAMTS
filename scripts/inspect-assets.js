require("dotenv").config();
const db = require("../server/config/db");
(async () => {
  const [rows] = await db.query(`
    SELECT a.asset_tag, a.asset_name, a.status,
           u.email AS assigned_to,
           m.maintenance_status
    FROM assets a
    LEFT JOIN asset_assignments aa
      ON aa.asset_id = a.id AND aa.assignment_status = 'Assigned'
    LEFT JOIN users u ON u.id = aa.staff_id
    LEFT JOIN maintenance m
      ON m.asset_id = a.id
      AND m.maintenance_status IN ('Pending', 'In Progress', 'Out of Service')
    ORDER BY a.asset_tag
  `);
  console.table(rows);
  await db.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
