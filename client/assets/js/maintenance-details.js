function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function toClass(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

const params = new URLSearchParams(window.location.search);

const maintenanceId = params.get("id");

if (!maintenanceId) {
  showToast("Maintenance record not specified.", "warning");

  window.location.href = "/dashboard";
}

fetch("/maintenance/details/" + encodeURIComponent(maintenanceId))
  .then((response) => response.json())
  .then((data) => {
    document.querySelector("#assetName").textContent = data.asset_name;

    document.querySelector("#assetTag").textContent = data.asset_tag;

    document.querySelector("#category").textContent = data.category_name;

    document.querySelector("#brand").textContent = data.brand;

    document.querySelector("#model").textContent = data.model;

    document.querySelector("#reportedBy").textContent = data.reported_by;

    document.querySelector("#problemTitle").textContent = data.problem_title;

    document.querySelector("#problemDescription").textContent =
      data.problem_description;

    const priorityEl = document.querySelector("#priority");
    priorityEl.textContent = data.priority;
    priorityEl.className = `status-badge priority-${toClass(data.priority)}`;

    const statusEl = document.querySelector("#status");
    statusEl.textContent = data.maintenance_status;
    statusEl.className = `status-badge status-${toClass(data.maintenance_status)}`;

    document.querySelector("#technician").textContent =
      data.technician || "Not Assigned";

    document.querySelector("#remarks").textContent = data.remarks || "-";

    document.querySelector("#dateReported").textContent = formatDateTime(
      data.date_reported,
    );

    document.querySelector("#dateCompleted").textContent = data.date_completed
      ? formatDateTime(data.date_completed)
      : "-";
  })
  .catch((error) => {
    console.error(error);

    showToast("Failed to load maintenance details.", "error");
  });

document.querySelector("#backBtn").addEventListener("click", () => {
  window.history.back();
});
