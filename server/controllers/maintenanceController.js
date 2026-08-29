const Maintenance = require("../models/Maintenance");
const AuditLog = require("../models/AuditLog");
const {
  isNonEmptyString,
  isOneOf,
  isPositiveInteger,
  isWithinMaxLength,
} = require("../utils/validators");

const Notification = require("../models/Notification");
const Preference = require("../models/Preference");
const User = require("../models/User");
const Asset = require("../models/Asset");

const MAINTENANCE_BUSINESS_MESSAGES = new Set([
  "The selected asset was not found.",
  "This asset is not assigned to you.",
  "A maintenance request for this asset is already open.",
  "A maintenance request for this asset is already in progress.",
  "Maintenance request is no longer pending or was not found.",
  "Maintenance request not found.",
  "Only Pending requests can be approved.",
  "Only Pending or In Progress requests can be marked Rejected or Out of Service.",
  "A valid technician must be selected.",
  "Maintenance request not found or is no longer assignable.",
  "MAINTENANCE_NOT_FOUND",
  "ASSET_NOT_FOUND",
]);

const MAINTENANCE_BUSINESS_PREFIXES = [
  "This asset cannot have a maintenance request",
];

function isMaintenanceBusinessError(err) {
  if (!err || typeof err.message !== "string") return false;
  if (MAINTENANCE_BUSINESS_MESSAGES.has(err.message)) return true;
  return MAINTENANCE_BUSINESS_PREFIXES.some((prefix) =>
    err.message.startsWith(prefix),
  );
}

function maintenanceErrorStatus(err) {
  if (err && err.message === "This asset is not assigned to you.") {
    return 403;
  }
  if (err && err.message === "MAINTENANCE_NOT_FOUND") {
    return 404;
  }
  return 400;
}

function maintenanceErrorMessage(err) {
  if (err && err.message === "MAINTENANCE_NOT_FOUND") {
    return "Maintenance request not found.";
  }
  if (err && err.message === "ASSET_NOT_FOUND") {
    return "The selected asset was not found.";
  }
  return err.message;
}

function notifyIfEnabled(userId, preferenceKey, message) {
  Preference.getPreferences(userId, (err, preferences) => {
    if (err) {
      console.error("Failed to load notification preferences:", err);
      return;
    }

    if (preferences[preferenceKey] !== 1) {
      return;
    }

    Notification.createNotification(userId, message, (err) => {
      if (err) {
        console.error("Failed to create notification:", err);
      }
    });
  });
}

function notifyStatusChange(maintenanceId, newStatus) {
  Maintenance.getMaintenanceDetails(maintenanceId, (err, results) => {
    if (err || !results || results.length === 0) {
      console.error(
        "Failed to fetch details for status-change notification:",
        err,
      );
      return;
    }

    const detail = results[0];

    if (detail.reported_by_id) {
      notifyIfEnabled(
        detail.reported_by_id,
        "notify_request_updates",
        `Your maintenance request for ${detail.asset_name} has been updated to ${newStatus}.`,
      );
    }

    if (detail.assigned_to) {
      notifyIfEnabled(
        detail.assigned_to,
        "notify_job_status",
        `Your assigned maintenance job for ${detail.asset_name} has been updated to ${newStatus}.`,
      );
    }

    if (newStatus === "Out of Service") {
      User.getUsers((userErr, users) => {
        if (userErr) {
          console.error(
            "Failed to fetch admins for critical notification:",
            userErr,
          );
          return;
        }

        const admins = users.filter((user) => user.role === "Admin");

        admins.forEach((admin) => {
          notifyIfEnabled(
            admin.id,
            "notify_critical",
            `Maintenance job for ${detail.asset_name} flagged Out of Service.`,
          );
        });
      });
    }
  });
}

const createRequest = (req, res) => {
  const { asset_id, problem_title, problem_description, priority } = req.body;

  if (!isPositiveInteger(asset_id)) {
    return res.status(400).json({ message: "A valid asset must be selected." });
  }

  if (!isNonEmptyString(problem_title)) {
    return res.status(400).json({ message: "Problem title is required." });
  }

  if (!isWithinMaxLength(problem_title, 200)) {
    return res
      .status(400)
      .json({ message: "Problem title must be at most 200 characters." });
  }

  if (!isNonEmptyString(problem_description)) {
    return res.status(400).json({ message: "Problem description is required." });
  }

  if (!isOneOf(priority, ["High", "Medium", "Low"])) {
    return res
      .status(400)
      .json({ message: "Priority must be High, Medium, or Low." });
  }

  Asset.getAssetById(asset_id, (assetErr, assetResults) => {
    if (assetErr) {
      console.error(assetErr);
      return res.status(500).json({ message: "Database error" });
    }

    if (assetResults.length === 0) {
      return res
        .status(400)
        .json({ message: "The selected asset was not found." });
    }

    const reported_by = req.user.id;

    Maintenance.createRequest(
      {
        asset_id,
        reported_by,
        problem_title,
        problem_description,
        priority,
      },
      (err, result) => {
        if (err) {
          if (isMaintenanceBusinessError(err)) {
            return res
              .status(maintenanceErrorStatus(err))
              .json({ message: maintenanceErrorMessage(err) });
          }

          console.error(err);

          return res.status(500).json({
            message: "Database error",
          });
        }

        AuditLog.record({
          actorUserId: req.user.id,
          actorRole: req.user.role,
          category: "MAINTENANCE",
          action: "REQUEST_CREATED",
          outcome: "success",
          targetType: "maintenance",
          targetId: result && result.insertId ? String(result.insertId) : null,
          detail: { asset_id, priority },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        User.getUsers((err, users) => {
          if (err) {
            console.error("Failed to fetch admins for notification:", err);
          } else {
            const admins = users.filter((user) => user.role === "Admin");

            admins.forEach((admin) => {
              notifyIfEnabled(
                admin.id,
                "notify_requests",
                `New maintenance request: ${problem_title}`,
              );
            });
          }
        });

        res.json({
          message: "Maintenance request submitted successfully!",
        });
      },
    );
  });
};

const getPendingRequests = (req, res) => {
  Maintenance.getPendingRequests((err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

const getTechnicianJobs = (req, res) => {
  const technicianId = req.user.id;

  Maintenance.getTechnicianJobs(technicianId, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

const getMyRequests = (req, res) => {
  const staffId = req.user.id;

  Maintenance.getMyRequests(staffId, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

const acceptRequest = (req, res) => {
  const technicianId = req.body.technician_id;

  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isPositiveInteger(technicianId)) {
    return res
      .status(400)
      .json({ message: "A valid technician must be selected." });
  }

  User.getUserById(technicianId, (userErr, userResults) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ message: "Database error" });
    }

    if (
      userResults.length === 0 ||
      userResults[0].role !== "Technician" ||
      userResults[0].status !== "Active"
    ) {
      return res
        .status(400)
        .json({ message: "The selected user is not an active technician." });
    }

    assignTechnician(req, res, technicianId);
  });
};

const assignTechnician = (req, res, technicianId) => {
  const maintenanceId = req.params.id;

  Maintenance.acceptRequest(maintenanceId, technicianId, (err, context) => {
    if (err) {
      if (isMaintenanceBusinessError(err)) {
        return res
          .status(maintenanceErrorStatus(err))
          .json({ message: maintenanceErrorMessage(err) });
      }

      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    AuditLog.record({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      category: "MAINTENANCE",
      action: "REQUEST_APPROVED",
      outcome: "success",
      targetType: "maintenance",
      targetId: String(maintenanceId),
      detail: {
        from: context ? context.currentStatus : "Pending",
        to: "In Progress",
        technician_id: technicianId,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    notifyIfEnabled(
      technicianId,
      "notify_assignments",
      "You've been assigned a new maintenance job.",
    );

    res.json({
      message: "Technician assigned successfully!",
    });
  });
};

const completeMaintenance = (req, res) => {
  const maintenanceId = req.params.id;
  const technicianId = req.user.id;
  const remarks = req.body.remarks;

  if (!isPositiveInteger(maintenanceId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isNonEmptyString(remarks)) {
    return res.status(400).json({ message: "Repair remarks are required." });
  }

  Maintenance.completeMaintenance(
    maintenanceId,
    technicianId,
    remarks,
    (err) => {
      if (err) {
        console.error(err);

        if (err.message === "NOT_OWNER_OR_NOT_IN_PROGRESS") {
          return res.status(403).json({
            message: "This job is not assigned to you or is not in progress.",
          });
        }

        if (isMaintenanceBusinessError(err)) {
          return res
            .status(maintenanceErrorStatus(err))
            .json({ message: maintenanceErrorMessage(err) });
        }

        return res.status(500).json({
          message: "Failed to complete maintenance.",
        });
      }

      AuditLog.record({
        actorUserId: technicianId,
        actorRole: req.user.role,
        category: "MAINTENANCE",
        action: "REQUEST_COMPLETED",
        outcome: "success",
        targetType: "maintenance",
        targetId: String(maintenanceId),
        detail: { from: "In Progress", to: "Completed" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      Maintenance.getMaintenanceDetails(maintenanceId, (err, results) => {
        if (err || !results || results.length === 0) {
          console.error("Failed to fetch details for notification:", err);
        } else {
          const detail = results[0];

          notifyIfEnabled(
            detail.reported_by_id,
            "notify_completions",
            `Your maintenance request for ${detail.asset_name} has been completed.`,
          );

          User.getUsers((userErr, users) => {
            if (userErr) {
              console.error(
                "Failed to fetch admins for critical notification:",
                userErr,
              );
              return;
            }

            const admins = users.filter((user) => user.role === "Admin");

            admins.forEach((admin) => {
              notifyIfEnabled(
                admin.id,
                "notify_critical",
                `Maintenance job for ${detail.asset_name} has been completed.`,
              );
            });
          });
        }
      });

      res.json({
        message: "Maintenance completed successfully.",
      });
    },
  );
};

const getMaintenanceDetails = (req, res) => {
  const maintenanceId = req.params.id || req.params.assetId;

  if (!isPositiveInteger(maintenanceId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  Maintenance.getMaintenanceDetails(maintenanceId, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Maintenance record not found.",
      });
    }

    const detail = results[0];

    if (
      req.user.role === "Technician" &&
      (detail.assigned_to === null || detail.assigned_to !== req.user.id)
    ) {
      return res.status(403).json({
        message: "This maintenance job is not assigned to you.",
      });
    }

    res.json(detail);
  });
};

const getAllRecords = (req, res) => {
  Maintenance.getAllRecords((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
};

const getTechnicianDashboard = (req, res) => {
  const technicianId = req.user.id;

  Maintenance.getTechnicianDashboard(technicianId, (err, jobs) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    const assignedJobs = jobs.length;

    const inProgress = jobs.filter(
      (job) => job.maintenance_status === "In Progress",
    ).length;

    const completed = jobs.filter(
      (job) => job.maintenance_status === "Completed",
    ).length;

    res.json({
      assignedJobs,
      inProgress,
      completed,
      jobs,
    });
  });
};

const getStaffDashboard = (req, res) => {
  const staffId = req.user.id;

  Maintenance.getStaffDashboard(staffId, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    const requests = result.requests;

    const totalRequests = requests.length;

    const completed = requests.filter(
      (request) => request.maintenance_status === "Completed",
    ).length;

    const pending = requests.filter(
      (request) =>
        request.maintenance_status === "Pending" ||
        request.maintenance_status === "In Progress",
    ).length;

    res.json({
      assignedAssets: result.assignedAssets,
      totalRequests,
      completed,
      pending,
      requests,
    });
  });
};

const cancelRequest = (req, res) => {
  const maintenanceId = req.params.id;
  const staffId = req.user.id;

  if (!isPositiveInteger(maintenanceId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  Maintenance.cancelRequest(maintenanceId, staffId, (err, affectedRows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (affectedRows === 0) {
      return res.status(400).json({
        message:
          "Request cannot be cancelled. It may not exist, not belong to you, or is no longer pending.",
      });
    }

    AuditLog.record({
      actorUserId: staffId,
      actorRole: req.user.role,
      category: "MAINTENANCE",
      action: "REQUEST_CANCELLED",
      outcome: "success",
      targetType: "maintenance",
      targetId: String(maintenanceId),
      detail: { from: "Pending", to: "Cancelled" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    User.getUsers((err, users) => {
      if (err) {
        console.error("Failed to fetch admins for notification:", err);
      } else {
        const admins = users.filter((user) => user.role === "Admin");

        admins.forEach((admin) => {
          notifyIfEnabled(
            admin.id,
            "notify_requests",
            "A maintenance request has been cancelled.",
          );
        });
      }
    });

    res.json({ message: "Request cancelled successfully." });
  });
};

const getLatestMaintenanceForAsset = (req, res) => {
  const assetId = req.params.assetId;

  if (!isPositiveInteger(assetId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  Maintenance.getLatestMaintenanceForAsset(assetId, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ message: "No maintenance record found for this asset." });
    }

    res.json({ id: results[0].id });
  });
};

const updateRequestStatus = (req, res) => {
  const maintenanceId = req.params.id;
  const newStatus = req.body.status;
  const technicianId = req.body.technician_id || null;
  const actorId = req.user.id;

  if (!isPositiveInteger(maintenanceId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isOneOf(newStatus, ["In Progress", "Rejected", "Out of Service"])) {
    return res.status(400).json({
      message: "Status must be In Progress, Rejected, or Out of Service.",
    });
  }

  const proceed = () => {
    Maintenance.updateRequestStatus(
      maintenanceId,
      newStatus,
      technicianId,
      actorId,
      (err, context) => {
        if (err) {
          if (isMaintenanceBusinessError(err)) {
            return res
              .status(maintenanceErrorStatus(err))
              .json({ message: maintenanceErrorMessage(err) });
          }

          console.error(err);

          return res.status(500).json({
            message:
              "Failed to update maintenance status. Transaction rolled back.",
          });
        }

        const actionMap = {
          "In Progress": "REQUEST_APPROVED",
          Rejected: "REQUEST_REJECTED",
          "Out of Service": "REQUEST_OUT_OF_SERVICE",
        };

        AuditLog.record({
          actorUserId: actorId,
          actorRole: req.user.role,
          category: "MAINTENANCE",
          action: actionMap[newStatus] || "REQUEST_UPDATED",
          outcome: "success",
          targetType: "maintenance",
          targetId: String(maintenanceId),
          detail: {
            from: context ? context.currentStatus : null,
            to: newStatus,
            ...(newStatus === "In Progress" ? { technician_id: technicianId } : {}),
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        notifyStatusChange(maintenanceId, newStatus);

        res.json({
          message: `Maintenance request marked as ${newStatus}.`,
        });
      },
    );
  };

  if (newStatus === "In Progress") {
    if (!isPositiveInteger(technicianId)) {
      return res
        .status(400)
        .json({ message: "A valid technician must be selected." });
    }

    User.getUserById(technicianId, (userErr, userResults) => {
      if (userErr) {
        console.error(userErr);
        return res.status(500).json({ message: "Database error" });
      }

      if (
        userResults.length === 0 ||
        userResults[0].role !== "Technician" ||
        userResults[0].status !== "Active"
      ) {
        return res
          .status(400)
          .json({ message: "The selected user is not an active technician." });
      }

      proceed();
    });

    return;
  }

  proceed();
};

const reassignTechnician = (req, res) => {
  const maintenanceId = req.params.id;
  const technicianId = req.body.technician_id;

  if (!isPositiveInteger(maintenanceId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isPositiveInteger(technicianId)) {
    return res
      .status(400)
      .json({ message: "A valid technician must be selected." });
  }

  User.getUserById(technicianId, (userErr, userResults) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ message: "Database error" });
    }

    if (
      userResults.length === 0 ||
      userResults[0].role !== "Technician" ||
      userResults[0].status !== "Active"
    ) {
      return res
        .status(400)
        .json({ message: "The selected user is not an active technician." });
    }

    Maintenance.reassignTechnician(maintenanceId, technicianId, (err, context) => {
      if (err) {
        if (isMaintenanceBusinessError(err)) {
          return res
            .status(maintenanceErrorStatus(err))
            .json({ message: maintenanceErrorMessage(err) });
        }

        console.error(err);

        return res.status(500).json({
          message: "Failed to assign technician. Transaction rolled back.",
        });
      }

      AuditLog.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        category: "MAINTENANCE",
        action: "TECHNICIAN_REASSIGNED",
        outcome: "success",
        targetType: "maintenance",
        targetId: String(maintenanceId),
        detail: {
          from_technician_id: context ? context.fromTechnicianId : null,
          to_technician_id: technicianId,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      notifyIfEnabled(
        technicianId,
        "notify_assignments",
        "You've been assigned a new maintenance job.",
      );

      res.json({ message: "Technician assigned successfully!" });
    });
  });
};

module.exports = {
  createRequest,
  getPendingRequests,
  getTechnicianJobs,
  getTechnicianDashboard,
  getStaffDashboard,
  getMyRequests,
  getMaintenanceDetails,
  getAllRecords,
  acceptRequest,
  completeMaintenance,
  cancelRequest,
  updateRequestStatus,
  reassignTechnician,
  getLatestMaintenanceForAsset,
};
