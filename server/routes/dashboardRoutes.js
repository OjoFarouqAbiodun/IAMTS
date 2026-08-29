const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

router.get(
  "/dashboard/stats",
  authenticate,
  checkRole("Admin"),
  dashboardController.getDashboardStats,
);

module.exports = router;
