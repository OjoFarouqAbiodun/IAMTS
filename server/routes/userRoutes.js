const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

router.get(
  "/users",
  authenticate,
  checkRole("Admin"),
  userController.getUsers,
);
router.get(
  "/users/:id",
  authenticate,
  checkRole("Admin"),
  userController.getUserById,
);
router.post(
  "/users",
  authenticate,
  checkRole("Admin"),
  userController.createUser,
);
router.put(
  "/users/:id",
  authenticate,
  checkRole("Admin"),
  userController.updateUser,
);
router.put(
  "/users/status/:id",
  authenticate,
  checkRole("Admin"),
  userController.changeStatus,
);

module.exports = router;
