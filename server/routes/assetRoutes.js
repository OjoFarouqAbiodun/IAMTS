const express = require("express");
const router = express.Router();

const assetController = require("../controllers/assetController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

router.get("/assets", authenticate, checkRole("Admin"), assetController.getAssets);
router.get(
  "/assets/:id",
  authenticate,
  checkRole("Admin"),
  assetController.getAssetById,
);
router.get(
  "/assets/:id/history",
  authenticate,
  checkRole("Admin"),
  assetController.getAssetHistory,
);
router.post(
  "/assets/register",
  authenticate,
  checkRole("Admin"),
  assetController.registerAsset,
);
router.get("/asset-categories", authenticate, assetController.getCategories);
router.get("/my-assets", authenticate, assetController.getAssignedAssets);
router.put(
  "/assets/:id",
  authenticate,
  checkRole("Admin"),
  assetController.updateAsset,
);
router.post(
  "/assets/assign",
  authenticate,
  checkRole("Admin"),
  assetController.assignAsset,
);
router.post(
  "/assets/return",
  authenticate,
  checkRole("Admin"),
  assetController.returnAsset,
);

module.exports = router;
