const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/authMiddleware");

router.get(
  "/notifications",
  authenticate,
  notificationController.getMyNotifications,
);

router.patch(
  "/notifications/mark-read",
  authenticate,
  notificationController.markAsRead,
);

router.get(
  "/notifications/preferences",
  authenticate,
  notificationController.getMyPreferences,
);

router.put(
  "/notifications/preferences",
  authenticate,
  notificationController.saveMyPreferences,
);

module.exports = router;
