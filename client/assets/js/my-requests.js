// escapeHtml, toClass, formatDate — provided by api.js

const tableBody = document.querySelector("#myRequestsTable");

const searchInput = document.querySelector("#searchInput");
const filterPriority = document.querySelector("#filterPriority");
const filterStatus = document.querySelector("#filterStatus");
const filterFrom = document.querySelector("#filterFrom");
const filterTo = document.querySelector("#filterTo");
const resetFiltersBtn = document.querySelector("#resetFilters");

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
    const haystack = `${request.asset_name} ${request.problem_title}`
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
        <td colspan="7" style="text-align:center;">
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

    const actionCell =
      request.maintenance_status === "Pending"
        ? `<button class="cancel-btn" data-id="${request.id}">Cancel</button>`
        : "-";

    row.innerHTML = `
      <td>${escapeHtml(request.asset_name)}</td>
      <td>${escapeHtml(request.problem_title)}</td>
      <td><span class="status-badge priority-${priorityClass}">${escapeHtml(request.priority)}</span></td>
      <td><span class="status-badge status-${statusClass}">${escapeHtml(request.maintenance_status)}</span></td>
      <td>${formatDate(request.date_reported)}</td>
      <td>${escapeHtml(request.remarks) || "-"}</td>
      <td>${actionCell}</td>
    `;

    tableBody.appendChild(row);
  });
}

function loadMyRequests() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;">Loading your requests...</td>
    </tr>
  `;

  fetch("/maintenance/my-requests")
    .then((response) => response.json())
    .then((requests) => {
      allRequests = requests;
      renderRequests();
    })
    .catch((error) => {
      console.error(error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;">
            Failed to load your requests. Please try again.
          </td>
        </tr>
      `;
    });
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

tableBody.addEventListener("click", (event) => {
  const cancelBtn = event.target.closest(".cancel-btn");
  if (!cancelBtn) return;

  const id = cancelBtn.dataset.id;
  const request = allRequests.find((item) => String(item.id) === String(id));

  if (!request) return;

  showConfirmModal({
    title: "Cancel Request",
    message: `Cancel maintenance request for "${request.asset_name}"?`,
    confirmText: "Cancel Request",
    onConfirm: () => {
      cancelBtn.disabled = true;

      fetch(`/maintenance/${id}/cancel`, {
        method: "PATCH",
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message);
          }
          return data;
        })
        .then((data) => {
          showToast(data.message, "success");
          loadMyRequests();
        })
        .catch((error) => {
          console.error(error);
          showToast(error.message, "error");
          cancelBtn.disabled = false;
        });
    },
  });
});

setupFilters();
loadMyRequests();
