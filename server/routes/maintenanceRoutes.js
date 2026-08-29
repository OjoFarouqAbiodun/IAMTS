const express = require("express");
const router = express.Router();

const maintenanceController = require("../controllers/maintenanceController");

const { authenticate, checkRole } = require("../middleware/authMiddleware");

router.post(
  "/maintenance",
  authenticate,
  checkRole("Staff"),
  maintenanceController.createRequest,
);

router.get(
  "/maintenance/pending",
  authenticate,
  checkRole("Admin"),
  maintenanceController.getPendingRequests,
);

router.get(
  "/maintenance/all",
  authenticate,
  checkRole("Admin"),
  maintenanceController.getAllRecords,
);

router.get(
  "/maintenance/technician",
  authenticate,
  checkRole("Technician"),
  maintenanceController.getTechnicianJobs,
);

router.get(
  "/maintenance/technician/dashboard",
  authenticate,
  checkRole("Technician"),
  maintenanceController.getTechnicianDashboard,
);

router.get(
  "/maintenance/staff/dashboard",
  authenticate,
  checkRole("Staff"),
  maintenanceController.getStaffDashboard,
);

router.get(
  "/maintenance/my-requests",
  authenticate,
  maintenanceController.getMyRequests,
);

router.get(
  "/maintenance/details/:id",
  authenticate,
  checkRole("Admin", "Technician"),
  maintenanceController.getMaintenanceDetails,
);

router.patch(
  "/maintenance/:id/accept",
  authenticate,
  checkRole("Admin"),
  maintenanceController.acceptRequest,
);

router.patch(
  "/maintenance/:id/complete",
  authenticate,
  checkRole("Technician"),
  maintenanceController.completeMaintenance,
);

router.patch(
  "/maintenance/:id/cancel",
  authenticate,
  maintenanceController.cancelRequest,
);

router.patch(
  "/maintenance/:id/status",
  authenticate,
  checkRole("Admin"),
  maintenanceController.updateRequestStatus,
);

router.patch(
  "/maintenance/:id/assign",
  authenticate,
  checkRole("Admin"),
  maintenanceController.reassignTechnician,
);

router.get(
  "/maintenance/latest-for-asset/:assetId",
  authenticate,
  checkRole("Admin"),
  maintenanceController.getLatestMaintenanceForAsset,
);

module.exports = router;
