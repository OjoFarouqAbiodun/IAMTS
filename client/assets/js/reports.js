let currentRange = "today";

let latestReportData = null;

const totalAssets = document.querySelector("#totalAssets");
const reportInventoryCount = document.querySelector("#inventoryCount");
const assetsAssignedCount = document.querySelector("#assetsAssignedCount");
const assetsUnderMaintenance = document.querySelector(
  "#assetsUnderMaintenance",
);
const pendingRequestsCount = document.querySelector("#pendingRequestsCount");
const inProgressRequestsCount = document.querySelector(
  "#inProgressRequestsCount",
);
const completedRequestsCount = document.querySelector(
  "#completedRequestsCount",
);
const cancelledRequestsCount = document.querySelector(
  "#cancelledRequestsCount",
);
const highPriorityFill = document.querySelector("#highPriorityFill");
const mediumPriorityFill = document.querySelector("#mediumPriorityFill");
const lowPriorityFill = document.querySelector("#lowPriorityFill");
const highPriorityCount = document.querySelector("#highPriorityCount");
const mediumPriorityCount = document.querySelector("#mediumPriorityCount");
const lowPriorityCount = document.querySelector("#lowPriorityCount");

const reportMaintenanceTableBody = document.querySelector(
  "#maintenanceTableBody",
);

const technicianWorkloadBody = document.querySelector(
  "#technicianWorkloadBody",
);

const recentActivityList = document.querySelector("#recentActivityList");

// escapeHtml, formatDate — provided by api.js

async function initializeReports() {
  setupReportFilters();
  setupExportControls();
  await loadReportData();
}

async function loadReportData() {
  try {
    const params = new URLSearchParams();
    params.set("range", currentRange);

    if (currentRange === "custom") {
      const startDate = document.querySelector("#reportStartDate")?.value;
      const endDate = document.querySelector("#reportEndDate")?.value;

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }

    const response = await fetch(`/reports/data?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      if (data && data.message) {
        showToast(data.message, "error");
      }

      return;
    }

    updateReportSummary(data);
    updatePriorityBlocks(data.priorityCounts);
    renderMaintenanceReport(data.assetMaintenanceReport);
    renderTechnicianWorkload(data.technicianWorkload);
    renderRecentActivity(data.recentActivity);
    renderDonutChart(data);
    renderPriorityBarChart(data.priorityCounts);
    renderWorkloadBarChart(data.technicianWorkload);
    latestReportData = data;
  } catch (error) {
    console.error(error);
  }
}

function updateReportSummary(data) {
  if (totalAssets) totalAssets.textContent = data.totalAssets;
  if (reportInventoryCount)
    reportInventoryCount.textContent = data.inventoryInStock;
  if (assetsAssignedCount)
    assetsAssignedCount.textContent = data.assetsAssigned;
  if (assetsUnderMaintenance)
    assetsUnderMaintenance.textContent = data.assetsUnderMaintenance;
  if (pendingRequestsCount)
    pendingRequestsCount.textContent = data.pendingRequests;
  if (inProgressRequestsCount)
    inProgressRequestsCount.textContent = data.inProgressRequests;
  if (completedRequestsCount)
    completedRequestsCount.textContent = data.completedRequests;
  if (cancelledRequestsCount)
    cancelledRequestsCount.textContent = data.cancelledRequests;
}

function updatePriorityBlocks(priorityCounts = { high: 0, medium: 0, low: 0 }) {
  const high = Number(priorityCounts.high) || 0;
  const medium = Number(priorityCounts.medium) || 0;
  const low = Number(priorityCounts.low) || 0;
  const maxCount = Math.max(high, medium, low) || 1;
  const highPct = Math.round((high / maxCount) * 100);
  const mediumPct = Math.round((medium / maxCount) * 100);
  const lowPct = Math.round((low / maxCount) * 100);

  if (highPriorityCount) {
    highPriorityCount.textContent = high;
  }

  if (mediumPriorityCount) {
    mediumPriorityCount.textContent = medium;
  }

  if (lowPriorityCount) {
    lowPriorityCount.textContent = low;
  }

  if (highPriorityFill) {
    highPriorityFill.style.width = `${high ? Math.max(highPct, 5) : 0}%`;
  }

  if (mediumPriorityFill) {
    mediumPriorityFill.style.width = `${medium ? Math.max(mediumPct, 5) : 0}%`;
  }

  if (lowPriorityFill) {
    lowPriorityFill.style.width = `${low ? Math.max(lowPct, 5) : 0}%`;
  }
}

function renderMaintenanceReport(rows) {
  if (!reportMaintenanceTableBody) return;

  if (!rows.length) {
    reportMaintenanceTableBody.innerHTML = `
      <tr class="table-empty">
        <td colspan="8">No maintenance report records found.</td>
      </tr>
    `;
    return;
  }

  reportMaintenanceTableBody.innerHTML = rows
    .map((row) => {
      const priorityClass = row.priority.toLowerCase().replace(/\s+/g, "-");
      const statusClass = row.maintenance_status
        .toLowerCase()
        .replace(/\s+/g, "-");

      return `
        <tr>
          <td>${escapeHtml(row.asset_name)}</td>
          <td>${escapeHtml(row.category_name) || "-"}</td>
          <td>${escapeHtml(row.reported_by)}</td>
          <td>${escapeHtml(row.problem_title)}</td>
          <td><span class="status-badge priority-${priorityClass}">${escapeHtml(row.priority)}</span></td>
          <td>${escapeHtml(row.technician) || "Unassigned"}</td>
          <td><span class="status-badge status-${statusClass}">${escapeHtml(row.maintenance_status)}</span></td>
          <td>${formatDate(row.date_reported)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTechnicianWorkload(rows) {
  if (!technicianWorkloadBody) return;

  if (!rows.length) {
    technicianWorkloadBody.innerHTML = `
      <tr class="table-empty">
        <td colspan="4">No technician workload data available.</td>
      </tr>
    `;
    return;
  }

  technicianWorkloadBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.technician_name)}</td>
          <td>${row.assigned_count}</td>
          <td>${row.in_progress_count}</td>
          <td>${row.completed_count}</td>
        </tr>
      `,
    )
    .join("");
}

function renderRecentActivity(events) {
  if (!recentActivityList) return;

  if (!events.length) {
    recentActivityList.innerHTML = `<li class="timeline-item">No recent activity found.</li>`;
    return;
  }

  recentActivityList.innerHTML = events
    .map((event) => {
      const technician = event.technician_name
        ? `Technician: ${escapeHtml(event.technician_name)}`
        : "Unassigned";

      const date =
        event.date_cancelled || event.date_completed || event.date_reported;

      const statusClass = event.maintenance_status
        .toLowerCase()
        .replace(/\s+/g, "-");

      return `
        <li class="timeline-item">
          <div class="timeline-title-row">
            <strong>${escapeHtml(event.asset_name)}</strong>
            <span class="status-badge status-${statusClass}">${escapeHtml(event.maintenance_status)}</span>
          </div>
          <span class="timeline-meta">${escapeHtml(event.problem_title)}</span>
          <small>${technician} · ${formatDate(date)}</small>
        </li>
      `;
    })
    .join("");
}

function renderDonutChart(data) {
  const donut = document.querySelector("#statusDonut");
  const totalEl = document.querySelector("#donutTotal");
  const legend = document.querySelector("#statusDonutLegend");
  if (!donut) return;

  const total = data.totalRequests || 0;
  const p = Number(data.pendingRequests) || 0;
  const ip = Number(data.inProgressRequests) || 0;
  const c = Number(data.completedRequests) || 0;
  const cx = Number(data.cancelledRequests) || 0;

  if (totalEl) totalEl.textContent = total;

  if (total <= 0 && (p + ip + c + cx) > 0) {
    if (totalEl) totalEl.textContent = p + ip + c + cx;
  }

  if (total > 0) {
    const pct = (v) => (v / total) * 360;
    const s1 = pct(p);
    const s2 = s1 + pct(ip);
    const s3 = s2 + pct(c);
    const s4 = s3 + pct(cx);
    donut.style.setProperty("--s1", `${s1}deg`);
    donut.style.setProperty("--s2", `${s2}deg`);
    donut.style.setProperty("--s3", `${s3}deg`);
    donut.style.setProperty("--s4", `${s4}deg`);
  } else {
    donut.style.setProperty("--s1", "0deg");
    donut.style.setProperty("--s2", "0deg");
    donut.style.setProperty("--s3", "0deg");
    donut.style.setProperty("--s4", "0deg");
  }

  if (legend) {
    const entries = [
      { label: "Pending", value: p, color: "#A86200" },
      { label: "In Progress", value: ip, color: "#21487C" },
      { label: "Completed", value: c, color: "#217A3A" },
      { label: "Cancelled", value: cx, color: "#B42332" },
    ];
    legend.innerHTML = entries
      .map(
        (e) => `
          <li>
            <span class="legend-swatch" style="background:${e.color}"></span>
            <span>${e.label}</span>
            <span class="legend-value">${e.value}</span>
          </li>
        `,
      )
      .join("");
  }
}

function renderPriorityBarChart(counts = { high: 0, medium: 0, low: 0 }) {
  const high = Number(counts.high) || 0;
  const medium = Number(counts.medium) || 0;
  const low = Number(counts.low) || 0;
  const max = Math.max(high, medium, low) || 1;

  const setBar = (id, value) => {
    const el = document.querySelector(id);
    if (el) el.style.width = `${value ? Math.max((value / max) * 100, 4) : 0}%`;
  };

  setBar("#priorityBarChart .bar-high", high);
  setBar("#priorityBarChart .bar-medium", medium);
  setBar("#priorityBarChart .bar-low", low);

  const setVal = (id, value) => {
    const el = document.querySelector(id);
    if (el) el.textContent = value;
  };
  setVal("#barHighValue", high);
  setVal("#barMediumValue", medium);
  setVal("#barLowValue", low);
}

function renderWorkloadBarChart(rows) {
  const container = document.querySelector("#workloadBarChart");
  if (!container) return;

  if (!rows || !rows.length) {
    container.innerHTML = `<p class="chart-empty">No workload data available.</p>`;
    return;
  }

  const counts = rows.map((r) =>
    Math.max(
      Number(r.assigned_count) || 0,
      Number(r.in_progress_count) || 0,
      Number(r.completed_count) || 0,
    ),
  );
  const max = Math.max(...counts, 1);

  container.innerHTML = rows
    .map((row) => {
      const total =
        (Number(row.assigned_count) || 0) +
        (Number(row.in_progress_count) || 0) +
        (Number(row.completed_count) || 0);
      const width = total ? Math.max((total / max) * 100, 4) : 0;
      return `
        <div class="chart-bar-row">
          <span class="chart-bar-label">${escapeHtml(row.technician_name)}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill bar-tech" style="width:${width}%"></div>
          </div>
          <strong class="chart-bar-value">${total}</strong>
        </div>
      `;
    })
    .join("");
}

function getRangeLabel() {
  if (currentRange === "today") return "Today";
  if (currentRange === "week") return "This Week";
  if (currentRange === "month") return "This Month";
  if (currentRange === "custom") {
    const s = document.querySelector("#reportStartDate")?.value;
    const e = document.querySelector("#reportEndDate")?.value;
    return s && e ? `${s} to ${e}` : "Custom Range";
  }
  return currentRange || "Today";
}

function getMaxId(rows) {
  let max = 0;
  (rows || []).forEach((r) => {
    if (r && typeof r.id === "number" && r.id > max) max = r.id;
  });
  return max;
}

function exportRowsToCSV(rows, headers, mapRow) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  (rows || []).forEach((row) => {
    lines.push(mapRow(row).map(esc).join(","));
  });
  return lines.join("\r\n");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportMaintenanceCSV(extension) {
  const data = latestReportData;
  if (!data) {
    showToast("No report data loaded yet. Try again.", "warning");
    return;
  }
  const csv = exportRowsToCSV(
    data.assetMaintenanceReport,
    [
      "Asset",
      "Asset Type",
      "Reported By",
      "Problem",
      "Priority",
      "Technician",
      "Status",
      "Date Reported",
    ],
    (row) => [
      row.asset_name,
      row.category_name,
      row.reported_by,
      row.problem_title,
      row.priority,
      row.technician || "Unassigned",
      row.maintenance_status,
      row.date_reported,
    ],
  );
  downloadFile(
    `iamts-maintenance-${getRangeLabel().replace(/\s+/g, "-").toLowerCase()}.${extension}`,
    csv,
    extension === "xls"
      ? "application/vnd.ms-excel"
      : "text/csv;charset=utf-8;",
  );
}

function exportWorkloadCSV(extension) {
  const data = latestReportData;
  if (!data) {
    showToast("No report data loaded yet. Try again.", "warning");
    return;
  }
  const csv = exportRowsToCSV(
    data.technicianWorkload,
    ["Technician", "Assigned", "In Progress", "Completed"],
    (row) => [
      row.technician_name,
      row.assigned_count,
      row.in_progress_count,
      row.completed_count,
    ],
  );
  downloadFile(
    `iamts-workload-${getRangeLabel().replace(/\s+/g, "-").toLowerCase()}.${extension}`,
    csv,
    extension === "xls"
      ? "application/vnd.ms-excel"
      : "text/csv;charset=utf-8;",
  );
}

function setupExportControls() {
  const csvBtn = document.querySelector("#exportCsvBtn");
  const excelBtn = document.querySelector("#exportExcelBtn");
  const printBtn = document.querySelector("#printReportBtn");

  if (csvBtn) {
    csvBtn.addEventListener("click", () => {
      exportMaintenanceCSV("csv");
      exportWorkloadCSV("csv");
      showToast("CSV report exported.", "success");
    });
  }

  if (excelBtn) {
    excelBtn.addEventListener("click", () => {
      exportMaintenanceCSV("xls");
      exportWorkloadCSV("xls");
      showToast("Excel report exported.", "success");
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const d = latestReportData;
      const generatedAt = document.querySelector("#printGeneratedAt");
      if (generatedAt) {
        generatedAt.textContent = new Date().toLocaleString();
      }
      const rangeLabel = document.querySelector("#printRangeLabel");
      if (rangeLabel) rangeLabel.textContent = getRangeLabel();
      window.print();
    });
  }
}

function setupReportFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const customRangeGroup = document.querySelector("#customRangeGroup");
  const applyCustomRange = document.querySelector("#applyCustomRange");
  const startDateInput = document.querySelector("#reportStartDate");
  const endDateInput = document.querySelector("#reportEndDate");

  filterButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      filterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      if (button.id === "filterCustom") {
        currentRange = "custom";

        if (customRangeGroup) customRangeGroup.hidden = false;
        if (applyCustomRange) applyCustomRange.hidden = false;

        return;
      }

      if (customRangeGroup) customRangeGroup.hidden = true;
      if (applyCustomRange) applyCustomRange.hidden = true;

      currentRange = button.dataset.range;

      await loadReportData();
    });
  });

  if (applyCustomRange) {
    applyCustomRange.addEventListener("click", async () => {
      const startDate = startDateInput?.value;
      const endDate = endDateInput?.value;

      if (!startDate || !endDate) {
        showToast("Please select both a start date and an end date.", "warning");
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        showToast("Start date cannot be after the end date.", "warning");
        return;
      }

      currentRange = "custom";

      await loadReportData();
    });
  }
}

if (document.querySelector("#reportsPage")) {
  document.addEventListener("DOMContentLoaded", initializeReports);
}
