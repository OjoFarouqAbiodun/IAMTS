const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

router.get(
  "/reports/data",
  authenticate,
  checkRole("Admin"),
  reportController.getReportData,
);

module.exports = router;
