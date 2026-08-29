// escapeHtml, formatDate — provided by api.js

const recordsTableBody = document.querySelector("#recordsTableBody");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const technicianFilter = document.querySelector("#technicianFilter");
const fromDate = document.querySelector("#fromDate");
const toDate = document.querySelector("#toDate");
const applyFiltersBtn = document.querySelector("#applyFilters");
const clearFiltersBtn = document.querySelector("#resetFilters");

let allRecords = [];

async function loadRecords() {
  try {
    const res = await fetch("/maintenance/all");
    if (!res.ok) {
      const text = await res.text();
      console.error("/maintenance/all returned", res.status, text);
      recordsTableBody.innerHTML = `<tr class="table-empty"><td colspan="9">Failed to load records (status ${res.status}).</td></tr>`;
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Unexpected /maintenance/all payload", data);
      recordsTableBody.innerHTML = `<tr class="table-empty"><td colspan="9">Failed to load records (invalid payload).</td></tr>`;
      return;
    }

    allRecords = data;
    renderRecords(allRecords);
    populateTechnicianFilter(allRecords);
  } catch (err) {
    console.error(err);
    recordsTableBody.innerHTML = `<tr class="table-empty"><td colspan="9">Failed to load records.</td></tr>`;
  }
}

function getStatusClass(status) {
  if (!status) return "status-badge";

  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  return `status-badge status-${normalized}`;
}

function renderRecords(rows) {
  if (!rows.length) {
    recordsTableBody.innerHTML = `<tr class="table-empty"><td colspan="9">No records found.</td></tr>`;
    return;
  }

 recordsTableBody.innerHTML = rows
   .map(
     (r) => `
    <tr>
      <td>${escapeHtml(r.asset_name)}</td>
      <td>${escapeHtml(r.reported_by)}</td>
      <td>${escapeHtml(r.problem_title)}</td>
      <td><span class="status-badge priority-${r.priority.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(r.priority)}</span></td>
      <td>${escapeHtml(r.technician) || "Unassigned"}</td>
      <td><span class="${getStatusClass(r.maintenance_status)}">${escapeHtml(r.maintenance_status)}</span></td>
      <td>${formatDate(r.date_reported)}</td>
      <td>${r.date_completed ? formatDate(r.date_completed) : "-"}</td>
      <td><a class="details-link" href="/maintenance-details?id=${r.id}">View Details</a></td>
    </tr>
  `,
   )
   .join("");
}

function applyFilters() {
  const search = (searchInput.value || "").trim().toLowerCase();
  const status = statusFilter ? statusFilter.value.toLowerCase() : "all";
  const priority = priorityFilter ? priorityFilter.value.toLowerCase() : "all";
  const tech = technicianFilter ? technicianFilter.value.toLowerCase() : "all";
  const from = fromDate.value ? new Date(fromDate.value) : null;
  const to = toDate.value ? new Date(toDate.value) : null;

  const filtered = allRecords.filter((r) => {
    const assetName = (r.asset_name || "").toString().toLowerCase();
    const problem = (r.problem_title || "").toString().toLowerCase();
    const reportedBy = (r.reported_by || "").toString().toLowerCase();
    const technicianName = (r.technician || "Unassigned")
      .toString()
      .toLowerCase();
    const recordStatus = (r.maintenance_status || "").toString().toLowerCase();
    const recordPriority = (r.priority || "").toString().toLowerCase();

    if (
      search &&
      !`${assetName} ${problem} ${reportedBy} ${technicianName}`.includes(
        search,
      )
    )
      return false;
    if (status !== "all" && recordStatus !== status) return false;
    if (priority !== "all" && recordPriority !== priority) return false;
    if (tech !== "all" && technicianName !== tech) return false;
    if (from && new Date(r.date_reported) < from) return false;
    if (to) {
      const dateReported = new Date(r.date_reported);
      if (
        dateReported >
        new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)
      )
        return false;
    }
    return true;
  });

  renderRecords(filtered);
}

function populateTechnicianFilter(rows) {
  if (!technicianFilter) return;

  const techs = Array.from(
    new Set(rows.map((r) => r.technician).filter(Boolean)),
  );
  technicianFilter.innerHTML =
    '<option value="All">Technician: All</option>' +
    techs
      .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
      .join("");
}

const filterInputs = [
  searchInput,
  statusFilter,
  priorityFilter,
  technicianFilter,
  fromDate,
  toDate,
].filter(Boolean);

if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", applyFilters);

filterInputs.forEach((input) => {
  const eventName =
    input.tagName.toLowerCase() === "input" && input.type === "text"
      ? "input"
      : "change";
  input.addEventListener(eventName, applyFilters);
});

if (clearFiltersBtn)
  clearFiltersBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (fromDate) fromDate.value = "";
    if (toDate) toDate.value = "";
    if (statusFilter) statusFilter.value = "All";
    if (priorityFilter) priorityFilter.value = "All";
    if (technicianFilter) technicianFilter.value = "All";
    renderRecords(allRecords);
  });

if (document.getElementById("recordsMain")) {
  document.addEventListener("DOMContentLoaded", loadRecords);
}
