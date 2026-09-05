function formatMySQLDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function getDateRange(range) {
  const now = new Date();

  const start = new Date(now);
  const end = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);

    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(start.getMonth() + 1);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
  } else {
    // Unknown range — default safely to today
    start.setHours(0, 0, 0, 0);

    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  }

  return {
    startDate: `${formatMySQLDate(start)} 00:00:00`,
    endDate: `${formatMySQLDate(end)} 00:00:00`,
  };
}

const Asset = require("../models/Asset");
const Maintenance = require("../models/Maintenance");

const getReportData = (req, res) => {
  const range = req.query.range || "today";

  let startDate;
  let endDate;

  if (range === "custom") {
    startDate = req.query.startDate;
    endDate = req.query.endDate;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required.",
      });
    }

    if (!isValidDateString(startDate)) {
      return res.status(400).json({
        message: "Start date must be a valid date (YYYY-MM-DD).",
      });
    }

    if (!isValidDateString(endDate)) {
      return res.status(400).json({
        message: "End date must be a valid date (YYYY-MM-DD).",
      });
    }

    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      return res.status(400).json({
        message: "Start date cannot be after the end date.",
      });
    }

    // Include the entire selected end date.
    const end = new Date(`${endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);

    endDate = `${formatMySQLDate(end)} 00:00:00`;
    startDate = `${startDate} 00:00:00`;
  } else {
    ({ startDate, endDate } = getDateRange(range));
  }

  Asset.getDashboardAssetSummary((err, assetResults) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    const assetSummary = Array.isArray(assetResults)
      ? assetResults[0] || {}
      : assetResults || {};

    Maintenance.getReportSummary(startDate, endDate, (err, reportSummary) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      Maintenance.getMaintenanceReport(
        startDate,
        endDate,
        (err, maintenanceRows) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
          }

          Maintenance.getTechnicianWorkload(
            startDate,
            endDate,
            (err, workloadRows) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: "Database error" });
              }

              Maintenance.getRecentActivity(
                startDate,
                endDate,
                (err, activityRows) => {
                  if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Database error" });
                  }

                  const response = {
                    totalRequests: reportSummary.totalRequests,
                    totalAssets: assetSummary.totalAssets,
                    inventoryInStock: assetSummary.inventoryInStock,
                    assetsAssigned: assetSummary.assetsAssigned,
                    assetsUnderMaintenance: assetSummary.assetsUnderMaintenance,
                    pendingRequests: reportSummary.pendingRequests,
                    inProgressRequests: reportSummary.inProgressRequests,
                    completedRequests: reportSummary.completedRequests,
                    cancelledRequests: reportSummary.cancelledRequests,
                    rejectedRequests: reportSummary.rejectedRequests,
                    outOfServiceRequests: reportSummary.outOfServiceRequests,
                    priorityCounts: reportSummary.priorityCounts,
                    assetMaintenanceReport: maintenanceRows,
                    technicianWorkload: workloadRows,
                    recentActivity: activityRows,
                  };

                  res.json(response);
                },
              );
            },
          );
        },
      );
    });
  });
};

module.exports = {
  getReportData,
};
