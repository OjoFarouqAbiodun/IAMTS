const express = require("express");
const router = express.Router();

const auditController = require("../controllers/auditController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

// Admin-only read access to the audit log. There are no write, delete, or
// purge endpoints; audit writes happen only inside server-side code.
router.get(
  "/audit",
  authenticate,
  checkRole("Admin"),
  auditController.listAuditLog,
);

router.get(
  "/audit/stats",
  authenticate,
  checkRole("Admin"),
  auditController.getAuditStats,
);

module.exports = router;
