// escapeHtml, formatDate — provided by api.js

const tableBody = document.querySelector("#pendingRequestsTable");
const assignModal = document.querySelector("#assignModal");
const technicianSelect = document.querySelector("#technicianSelect");
const assignTechnicianBtn = document.querySelector("#assignTechnicianBtn");
const cancelAssignBtn = document.querySelector("#cancelAssignBtn");

const searchInput = document.querySelector("#searchInput");
const filterPriority = document.querySelector("#filterPriority");
const filterStatus = document.querySelector("#filterStatus");
const filterFrom = document.querySelector("#filterFrom");
const filterTo = document.querySelector("#filterTo");
const resetFiltersBtn = document.querySelector("#resetFilters");

let selectedMaintenanceId = null;
let allRequests = [];

function getFilters() {
  return {
    search: (searchInput?.value || "").trim().toLowerCase(),
    priority: filterPriority?.value || "",
    status: filterStatus?.value || "",
    from: filterFrom?.value || "",
    to: filterTo?.value || "",
  };
}

function requestMatches(request, filters) {
  if (filters.search) {
    const haystack = `${request.full_name} ${request.asset_name} ${request.problem_title}`
      .toLowerCase();
    if (!haystack.includes(filters.search)) return false;
  }

  if (filters.priority && request.priority !== filters.priority) return false;

  if (filters.status && request.maintenance_status !== filters.status) {
    return false;
  }

  const date = (request.date_reported || "").slice(0, 10);
  if (filters.from && date < filters.from) return false;
  if (filters.to && date > filters.to) return false;

  return true;
}

function renderRequests() {
  const filters = getFilters();
  const filtered = allRequests.filter((request) =>
    requestMatches(request, filters),
  );

  tableBody.innerHTML = "";

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">
          No maintenance requests match your filters.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((request) => {
    const row = document.createElement("tr");
    const priorityClass = request.priority
      .toLowerCase()
      .replace(/\s+/g, "-");

    row.innerHTML = `
      <td>${escapeHtml(request.full_name)}</td>
      <td>${escapeHtml(request.asset_name)}</td>
      <td>${escapeHtml(request.problem_title)}</td>
      <td><span class="status-badge priority-${priorityClass}">${escapeHtml(request.priority)}</span></td>
      <td>${formatDate(request.date_reported)}</td>
      <td>
        <div class="action-cell-group">
          <button class="approve-btn" data-id="${request.id}" data-action="approve">Approve</button>
          <button class="reject-btn" data-id="${request.id}" data-action="reject">Reject</button>
          <button class="assign-btn" data-id="${request.id}" data-action="assign">Assign</button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

async function loadPendingRequests() {
  try {
    const response = await fetch("/maintenance/pending");
    const requests = await response.json();

    if (!response.ok) {
      throw new Error(requests.message || "Failed to load pending requests.");
    }

    allRequests = requests;
    renderRequests();
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">
          Failed to load maintenance requests.
        </td>
      </tr>
    `;
  }
}

function setButtonPending(button, pending) {
  if (!button) return;

  if (pending) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Loading...";
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
}

async function changeRequestStatus(id, status, button) {
  setButtonPending(button, true);

  try {
    const response = await fetch(`/maintenance/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update request.");
    }

    showToast(data.message, "success");
    await loadPendingRequests();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to update request.", "error");
  }
}

function openAssignModal(id) {
  selectedMaintenanceId = id;

  const request = allRequests.find((r) => String(r.id) === String(id));

  const requesterEl = document.querySelector("#assignRequester");
  const assetEl = document.querySelector("#assignAsset");
  const problemEl = document.querySelector("#assignProblem");

  if (requesterEl) {
    requesterEl.textContent = request?.full_name || "-";
  }

  if (assetEl) {
    assetEl.textContent = request?.asset_name || "-";
  }

  if (problemEl) {
    problemEl.textContent = request?.problem_title || "-";
  }

  loadTechnicians();
  assignModal.style.display = "flex";
}

function closeAssignModal() {
  assignModal.style.display = "none";
  if (technicianSelect) technicianSelect.selectedIndex = 0;
  selectedMaintenanceId = null;
}

async function loadTechnicians() {
  if (!technicianSelect) return;

  try {
    const response = await fetch("/users");
    const users = await response.json();

    if (!response.ok) {
      throw new Error(users.message || "Failed to load technicians.");
    }

    technicianSelect.innerHTML = `
      <option value="">
        Select Technician
      </option>
    `;

    users
      .filter(
        (user) => user.role === "Technician" && user.status === "Active",
      )
      .forEach((technician) => {
        const option = document.createElement("option");
        option.value = technician.id;
        option.textContent = technician.full_name;
        technicianSelect.appendChild(option);
      });
  } catch (error) {
    console.error(error);
    showToast("Failed to load technicians.", "error");
  }
}

async function assignTechnician() {
  if (!selectedMaintenanceId) {
    showToast("No maintenance request selected.", "error");
    return;
  }

  const technicianId = technicianSelect?.value;

  if (!technicianId) {
    showToast("Please select a technician.", "error");
    return;
  }

  setButtonPending(assignTechnicianBtn, true);

  try {
    const response = await fetch(
      `/maintenance/${selectedMaintenanceId}/assign`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          technician_id: technicianId,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Assignment failed.");
    }

    showToast(data.message, "success");
    closeAssignModal();
    await loadPendingRequests();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Assignment failed.", "error");
  } finally {
    setButtonPending(assignTechnicianBtn, false);
  }
}

function setupModalEvents() {
  if (!assignModal || assignModal.dataset.wired) return;
  assignModal.dataset.wired = "true";

  if (cancelAssignBtn) {
    cancelAssignBtn.addEventListener("click", closeAssignModal);
  }

  if (assignTechnicianBtn) {
    assignTechnicianBtn.addEventListener("click", assignTechnician);
  }
}

function setupFilters() {
  [searchInput, filterPriority, filterStatus, filterFrom, filterTo].forEach(
    (element) => {
      if (element) element.addEventListener("input", renderRequests);
    },
  );

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterPriority) filterPriority.value = "";
      if (filterStatus) filterStatus.value = "";
      if (filterFrom) filterFrom.value = "";
      if (filterTo) filterTo.value = "";
      renderRequests();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPendingRequests();
  setupFilters();
  setupModalEvents();

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "approve") {
      openAssignModal(id);
    } else if (action === "reject") {
      changeRequestStatus(id, "Rejected", button);
    } else if (action === "assign") {
      openAssignModal(id);
    }
  });
});
