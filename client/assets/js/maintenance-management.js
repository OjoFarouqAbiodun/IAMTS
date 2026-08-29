// escapeHtml, formatDate, toClass, setButtonPending — provided by api.js

const tableBody = document.querySelector("#requestTableBody");

const completeModal = document.querySelector("#completeModal");
const repairRemarks = document.querySelector("#repairRemarks");
const closeCompleteModal = document.querySelector("#closeCompleteModal");
const cancelComplete = document.querySelector("#cancelComplete");
const confirmComplete = document.querySelector("#confirmComplete");

const assignModal = document.querySelector("#assignModal");
const technicianSelect = document.querySelector("#technicianSelect");
const confirmAssign = document.querySelector("#confirmAssign");
const cancelAssign = document.querySelector("#cancelAssign");
const closeAssign = document.querySelector("#closeAssign");

const searchInput = document.querySelector("#searchInput");
const filterPriority = document.querySelector("#filterPriority");
const filterStatus = document.querySelector("#filterStatus");
const filterFrom = document.querySelector("#filterFrom");
const filterTo = document.querySelector("#filterTo");
const resetFiltersBtn = document.querySelector("#resetFilters");

let currentUser = null;
let selectedMaintenanceId = null;
let allRequests = [];
let techniciansLoaded = false;

function getReporter(request) {
  return request.full_name || request.reported_by || "-";
}

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
    const haystack = `${request.asset_name} ${getReporter(request)} ${request.problem_title}`
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

function buildActions(request) {
  if (currentUser?.role === "Technician") {
    if (request.maintenance_status === "In Progress") {
      return `<button class="completeBtn" data-id="${request.id}" data-action="complete">Complete</button>`;
    }
    return "-";
  }

  if (request.maintenance_status === "Pending") {
    return `
      <div class="action-cell-group">
        <button class="approve-btn" data-id="${request.id}" data-action="approve">Approve</button>
        <button class="reject-btn" data-id="${request.id}" data-action="reject">Reject</button>
        <button class="assign-btn" data-id="${request.id}" data-action="assign">Assign</button>
      </div>
    `;
  }

  if (request.maintenance_status === "In Progress") {
    return `
      <div class="action-cell-group">
        <button class="reject-btn" data-id="${request.id}" data-action="reject">Reject</button>
        <button class="assign-btn" data-id="${request.id}" data-action="assign">Assign</button>
      </div>
    `;
  }

  return "-";
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
    const statusClass = toClass(request.maintenance_status);
    const priorityClass = toClass(request.priority);

    row.innerHTML = `
      <td>${escapeHtml(request.asset_name)}</td>
      <td>${escapeHtml(getReporter(request))}</td>
      <td>${escapeHtml(request.problem_title)}</td>
      <td><span class="status-badge priority-${priorityClass}">${escapeHtml(request.priority)}</span></td>
      <td><span class="status-badge ${statusClass}">${escapeHtml(request.maintenance_status)}</span></td>
      <td>${buildActions(request)}</td>
    `;

    tableBody.appendChild(row);
  });
}

function loadMaintenanceRequests() {
  const endpoint =
    currentUser?.role === "Admin"
      ? "/maintenance/all"
      : "/maintenance/technician";

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center;">Loading maintenance requests...</td>
    </tr>
  `;

  fetch(endpoint)
    .then((response) => response.json())
    .then((requests) => {
      allRequests = requests;
      renderRequests();
    })
    .catch((error) => {
      console.error(error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;">
            Failed to load maintenance requests.
          </td>
        </tr>
      `;
    });
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
    await loadMaintenanceRequests();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to update request.", "error");
  }
}

function openCompleteModal(id) {
  selectedMaintenanceId = id;
  if (repairRemarks) repairRemarks.value = "";
  completeModal.classList.add("show");
}

function dismissCompleteModal() {
  completeModal.classList.remove("show");
  if (repairRemarks) repairRemarks.value = "";
  selectedMaintenanceId = null;
}

async function submitComplete() {
  if (!selectedMaintenanceId) {
    showToast("No maintenance request selected.", "error");
    return;
  }

  const remarks = repairRemarks?.value.trim();

  if (!remarks) {
    showToast("Please enter repair remarks.", "error");
    return;
  }

  setButtonPending(confirmComplete, true);

  try {
    const response = await fetch(
      `/maintenance/${selectedMaintenanceId}/complete`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ remarks }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to complete maintenance.");
    }

    showToast(data.message, "success");
    dismissCompleteModal();
    await loadMaintenanceRequests();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to complete maintenance.", "error");
  } finally {
    setButtonPending(confirmComplete, false);
  }
}

function openAssignModal(id) {
  selectedMaintenanceId = id;
  assignModal.classList.add("show");
  loadTechnicians();
}

function closeAssignModal() {
  assignModal.classList.remove("show");
  if (technicianSelect) technicianSelect.selectedIndex = 0;
  selectedMaintenanceId = null;
}

async function loadTechnicians() {
  if (!technicianSelect) return;
  if (techniciansLoaded) return;

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

    techniciansLoaded = true;
  } catch (error) {
    console.error(error);
    showToast("Failed to load technicians.", "error");
  }
}

async function submitAssign() {
  if (!selectedMaintenanceId) {
    showToast("No maintenance request selected.", "error");
    return;
  }

  const technicianId = technicianSelect?.value;

  if (!technicianId) {
    showToast("Please select a technician.", "error");
    return;
  }

  setButtonPending(confirmAssign, true);

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
    await loadMaintenanceRequests();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Assignment failed.", "error");
  } finally {
    setButtonPending(confirmAssign, false);
  }
}

function setupModalEvents() {
  if (completeModal && !completeModal.dataset.wired) {
    completeModal.dataset.wired = "true";

    if (closeCompleteModal) {
      closeCompleteModal.addEventListener("click", dismissCompleteModal);
    }
    if (cancelComplete) {
      cancelComplete.addEventListener("click", dismissCompleteModal);
    }
    if (confirmComplete) {
      confirmComplete.addEventListener("click", submitComplete);
    }
  }

  if (assignModal && !assignModal.dataset.wired) {
    assignModal.dataset.wired = "true";

    if (closeAssign) {
      closeAssign.addEventListener("click", closeAssignModal);
    }
    if (cancelAssign) {
      cancelAssign.addEventListener("click", closeAssignModal);
    }
    if (confirmAssign) {
      confirmAssign.addEventListener("click", submitAssign);
    }
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

setupModalEvents();
setupFilters();

fetch("/me")
  .then((response) => response.json())
  .then((user) => {
    currentUser = user;
    loadMaintenanceRequests();
  })
  .catch((error) => {
    console.error(error);
    showToast("Failed to load user information.", "error");
  });

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
  } else if (action === "complete") {
    openCompleteModal(id);
  }
});
