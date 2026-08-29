// escapeHtml, toClass, formatDate, fetchJson, setButtonPending — provided by api.js

async function loadNotifications() {
  try {
    const response = await fetch("/notifications");
    const data = await response.json();

    const badge = document.querySelector(".notification-badge");
    if (badge) {
      badge.textContent = data.unreadCount;
      badge.style.display = data.unreadCount > 0 ? "flex" : "none";
    }

    renderNotificationDropdown(data.notifications);

    return data.notifications;
  } catch (error) {
    console.error(error);
    showToast("Failed to load notifications.", "error");
  }
}

function renderNotificationDropdown(notifications) {
  const list = document.querySelector("#notificationList");
  if (!list) return;

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `<div class="notification-empty">No notifications.</div>`;
    return;
  }

  list.innerHTML = notifications
    .map(
      (notification) => `
        <div class="notification-item ${notification.is_read ? "" : "unread"}">
          ${escapeHtml(notification.message)}
          <small>${formatDate(notification.created_at)}</small>
        </div>
      `,
    )
    .join("");
}

function setupNotificationDropdown() {
  const notificationBtn = document.querySelector("#notificationBtn");
  const notificationDropdown = document.querySelector("#notificationDropdown");

  if (!notificationBtn || !notificationDropdown) return;

  notificationBtn.addEventListener("click", async (event) => {
    event.stopPropagation();

    const isOpening = !notificationDropdown.classList.contains("show");

    notificationDropdown.classList.toggle("show");

    if (isOpening) {
      try {
        await fetch("/notifications/mark-read", { method: "PATCH" });

        const badge = document.querySelector(".notification-badge");
        if (badge) {
          badge.style.display = "none";
        }

        document
          .querySelectorAll(".notification-item.unread")
          .forEach((item) => {
            item.classList.remove("unread");
          });
  } catch (error) {
    console.error(error);
    showToast("Failed to mark notifications as read.", "error");
  }
}
  });

  document.addEventListener("click", () => {
    notificationDropdown.classList.remove("show");
  });
}

const logoutBtn = document.querySelector("#logoutBtn");

const welcomeText = document.querySelector("#welcomeText");
const roleText = document.querySelector("#roleText");

const assetCount = document.querySelector("#assetCount");
const maintenanceCount = document.querySelector("#maintenanceCount");
const pendingRequestCount = document.querySelector("#pendingRequestCount");
const inventoryCount = document.querySelector("#inventoryCount");

const maintenanceTableBody = document.querySelector("#maintenanceTableBody");

let pendingMaintenanceRequests = [];

document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

async function initializeDashboard() {
  setupLogout();
  setupDrawer();

  await loadNotifications();
  setupNotificationDropdown();

  const role = await loadCurrentUser();

  if (!role) return;

  const isDashboardPage =
    document.querySelector("#adminDashboard") ||
    document.querySelector("#technicianDashboard") ||
    document.querySelector("#staffDashboard");

  if (isDashboardPage) {
    if (role === "Admin") {
      await loadDashboardStats();
      await loadPendingMaintenance();
    }

    if (role === "Technician") {
      await loadTechnicianDashboard();
    }

    if (role === "Staff") {
      await loadStaffDashboard();
    }
  }

  if (typeof setupModalEvents === "function") {
    setupModalEvents();
  }

  // Reveal UI now that user info and permissions are applied to avoid flicker
  try {
    document.body.classList.add("js-ready");
  } catch (e) {}
}

function setupLogout() {
  const sidebarLogout = document.querySelector("#logoutBtn");
  const headerLogout = document.querySelector("#headerLogout");

  if (sidebarLogout) {
    sidebarLogout.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }

  if (headerLogout) {
    headerLogout.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }
}

function setupDrawer() {
  const sidebar = document.querySelector(".sidebar");
  const headerLeft = document.querySelector(".header-left");
  if (!sidebar || !headerLeft) return;

  let toggle = document.querySelector(".sidebar-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sidebar-toggle";
    toggle.id = "sidebarToggle";
    toggle.setAttribute("aria-label", "Open navigation menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    headerLeft.prepend(toggle);
  }

  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebarOverlay";
    document.body.appendChild(overlay);
  }

  const openDrawer = () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");
  };

  const closeDrawer = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  };

  toggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
}

async function logoutUser() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Logout failed.");
    }

    window.location.href = "/login.html?logout=success";
  } catch (error) {
    console.error(error);

    window.location.href = "/login.html";
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch("/me");

    const user = await response.json();

    displayCurrentUser(user);

    applyRolePermissions(user.role);

    return user.role;
  } catch (error) {
    console.error(error);
    showToast("Failed to load user information. Please refresh the page.", "error");
    return null;
  }
}

function displayCurrentUser(user) {
  const headerUserName = document.querySelector("#headerUserName");
  const headerUserRole = document.querySelector("#headerUserRole");
  const userAvatar = document.querySelector("#userAvatar");
  const pageSubtitle = document.querySelector("#pageSubtitle");
  const pageTitle = document.querySelector("#pageTitle");

  if (headerUserName) {
    headerUserName.textContent = user.full_name;
  }

  if (headerUserRole) {
    headerUserRole.textContent = user.role;
  }

  if (userAvatar) {
    const initials = user.full_name
      .split(" ")
      .map((name) => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");

    userAvatar.textContent = initials;
  }

  if (pageSubtitle && pageTitle?.textContent.trim() === "Dashboard") {
    const hour = new Date().getHours();

    let greeting = "Welcome";

    if (hour < 12) {
      greeting = "☀ Good Morning";
    } else if (hour < 18) {
      greeting = "🌤 Good Afternoon";
    } else {
      greeting = "🌙 Good Evening";
    }

    pageSubtitle.textContent = `${greeting}, ${user.full_name}`;
  }
}

function applyRolePermissions(role) {
  const adminDashboard = document.querySelector("#adminDashboard");
  const technicianDashboard = document.querySelector("#technicianDashboard");
  const staffDashboard = document.querySelector("#staffDashboard");

  switch (role) {
    case "Admin":
      if (adminDashboard) adminDashboard.style.display = "block";
      if (technicianDashboard) technicianDashboard.style.display = "none";
      if (staffDashboard) staffDashboard.style.display = "none";

      hideMenus([
        "menuRequestMaintenance",
        "menuMyRequests",
        "menuTechnicianMaintenance",
      ]);
      break;

    case "Technician":
      if (adminDashboard) adminDashboard.style.display = "none";
      if (technicianDashboard) technicianDashboard.style.display = "block";
      if (staffDashboard) staffDashboard.style.display = "none";

      hideMenus([
        "menuAssets",
        "menuUsers",
        "menuReports",
        "menuRequestMaintenance",
        "menuMyRequests",
      ]);

      showMenus(["menuTechnicianMaintenance", "menuSettings"]);
      break;

    case "Staff":
      if (adminDashboard) adminDashboard.style.display = "none";
      if (technicianDashboard) technicianDashboard.style.display = "none";
      if (staffDashboard) staffDashboard.style.display = "block";

      hideMenus([
        "menuAssets",
        "menuUsers",
        "menuReports",
        "menuTechnicianMaintenance",
      ]);

      showMenus(["menuRequestMaintenance", "menuMyRequests", "menuSettings"]);
      break;
  }
}

function hideMenus(menuIds) {
  menuIds.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.style.display = "none";
    }
  });
}

function showMenus(menuIds) {
  menuIds.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.style.display = "block";
    }
  });
}

async function loadDashboardStats() {
  if (
    !assetCount &&
    !maintenanceCount &&
    !pendingRequestCount &&
    !inventoryCount
  ) {
    return;
  }

  try {
    const response = await fetch("/dashboard/stats");

    const stats = await response.json();

    updateDashboardStats(stats);
  } catch (error) {
    console.error(error);
    showToast("Failed to load dashboard statistics.", "error");
  }
}

function updateDashboardStats(stats) {
  if (assetCount) {
    assetCount.textContent = stats.totalAssets;
  }

  if (maintenanceCount) {
    maintenanceCount.textContent = stats.assetsUnderMaintenance;
  }

  if (pendingRequestCount) {
    pendingRequestCount.textContent = stats.pendingRequests;
  }

  if (inventoryCount) {
    inventoryCount.textContent = stats.inventoryInStock;
  }
}

async function loadTechnicianDashboard() {
  try {
    const response = await fetch("/maintenance/technician/dashboard");
    const data = await response.json();

    document.querySelector("#assignedJobsCount").textContent =
      data.assignedJobs;

    document.querySelector("#inProgressCount").textContent = data.inProgress;

    document.querySelector("#completedJobsCount").textContent = data.completed;

    renderTechnicianJobs(data.jobs);
  } catch (error) {
    console.error(error);
    showToast("Failed to load technician dashboard.", "error");
  }
}

async function loadStaffDashboard() {
  try {
    const response = await fetch("/maintenance/staff/dashboard");
    const data = await response.json();

    document.querySelector("#staffRequestsCount").textContent =
      data.totalRequests;

    document.querySelector("#staffCompletedCount").textContent = data.completed;

    document.querySelector("#staffAssetsCount").textContent =
      data.assignedAssets;

    renderStaffRequests(data.requests);
  } catch (error) {
    console.error(error);
    showToast("Failed to load staff dashboard.", "error");
  }
}

async function loadPendingMaintenance() {
  if (!maintenanceTableBody) return;

  try {
    const response = await fetch("/maintenance/pending");
    const requests = await response.json();

    pendingMaintenanceRequests = requests;
    renderPendingMaintenance(requests);
  } catch (error) {
    console.error(error);

    maintenanceTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Failed to load maintenance requests.
                </td>
            </tr>
        `;
  }
}

function renderPendingMaintenance(requests) {
  maintenanceTableBody.innerHTML = "";

  if (!requests.length) {
    maintenanceTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No pending maintenance requests.
                </td>
            </tr>
        `;

    return;
  }

  requests.forEach((request) => {
    const row = document.createElement("tr");

    row.innerHTML = `
            <td>${escapeHtml(request.full_name)}</td>

            <td>${escapeHtml(request.asset_name)}</td>

            <td>${escapeHtml(request.problem_title)}</td>

            <td>
                <span class="status-badge priority-${request.priority.toLowerCase().replace(/\s+/g, "-")}">
                    ${escapeHtml(request.priority)}
                </span>
            </td>

           <td>
                <span class="status-badge status-${request.maintenance_status.toLowerCase().replace(/\s+/g, "-")}">
                    ${escapeHtml(request.maintenance_status)}
                </span>
            </td>

            <td>
                ${formatDate(request.date_reported)}
            </td>

            <td>
                <div class="action-cell-group">
                    <button
                        type="button"
                        class="approve-btn assignBtn"
                        data-id="${request.id}">
                        Assign
                    </button>
                </div>
            </td>
        `;

    maintenanceTableBody.appendChild(row);
  });

  attachAssignButtonEvents();
}

function renderTechnicianJobs(jobs) {
  const technicianTable = document.querySelector("#technicianDashboardTable");

  if (!technicianTable) return;

  technicianTable.innerHTML = "";

  if (jobs.length === 0) {
    technicianTable.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;">
          No assigned maintenance jobs.
        </td>
      </tr>
    `;
    return;
  }

  jobs.forEach((job) => {
    const row = document.createElement("tr");

    row.innerHTML = `
  <td>${escapeHtml(job.asset_name)}</td>
  <td>${escapeHtml(job.problem_title)}</td>
  <td>${escapeHtml(job.priority)}</td>
  <td>
    <span class="maintenance-status-badge ${job.maintenance_status
      .toLowerCase()
      .replace(/\s+/g, "-")}">
      ${escapeHtml(job.maintenance_status)}
    </span>
  </td>
  <td>
    <a href="/maintenance-details?id=${job.id}"
       class="view-btn">
      Open
    </a>
  </td>
`;

    technicianTable.appendChild(row);
  });
}

function renderStaffRequests(requests) {
  const staffTable = document.querySelector("#staffDashboardTable");

  if (!staffTable) return;

  staffTable.innerHTML = "";

  if (requests.length === 0) {
    staffTable.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">
          No maintenance requests.
        </td>
      </tr>
    `;
    return;
  }

  requests.forEach((request) => {
    const row = document.createElement("tr");

    const status = request.maintenance_status
      .toLowerCase()
      .replace(/\s+/g, "-");

    row.innerHTML = `
    <td>${escapeHtml(request.asset_name)}</td>
    <td>${escapeHtml(request.problem_title)}</td>
    <td>
  <span class="maintenance-status-badge ${status}">
    ${escapeHtml(request.maintenance_status)}
  </span>
</td>
    <td>${formatDate(request.date_reported)}</td>
  `;

    staffTable.appendChild(row);
  });
}

function attachAssignButtonEvents() {
  const buttons = document.querySelectorAll(".assignBtn");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      dashboardSelectedMaintenanceId = button.dataset.id;

      openAssignModal();

      await loadTechnicians();
    });
  });
}

const dashboardAssignModal = document.querySelector("#assignModal");
const dashboardTechnicianSelect = document.querySelector("#technicianSelect");
const dashboardAssignTechnicianBtn = document.querySelector("#assignTechnicianBtn");
const dashboardCancelAssignBtn = document.querySelector("#cancelAssignBtn");

let dashboardSelectedMaintenanceId = null;

async function loadTechnicians() {
  if (!dashboardTechnicianSelect) return;

  try {
    const response = await fetch("/users");

    const users = await response.json();

    dashboardTechnicianSelect.innerHTML = `
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

        dashboardTechnicianSelect.appendChild(option);
      });
  } catch (error) {
    console.error(error);

    showToast("Failed to load technicians.", "error");
  }
}

function setupModalEvents() {
  if (!dashboardAssignModal || dashboardAssignModal.dataset.wired) return;
  dashboardAssignModal.dataset.wired = "true";

  if (dashboardCancelAssignBtn) {
    dashboardCancelAssignBtn.addEventListener("click", closeAssignModal);
  }

  if (dashboardAssignTechnicianBtn) {
    dashboardAssignTechnicianBtn.addEventListener("click", assignTechnician);
  }
}

function openAssignModal() {
  if (!dashboardAssignModal) return;

  const request = pendingMaintenanceRequests.find(
    (r) => String(r.id) === String(dashboardSelectedMaintenanceId),
  );

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

  dashboardAssignModal.style.display = "flex";
}

function closeAssignModal() {
  if (dashboardAssignModal) {
    dashboardAssignModal.style.display = "none";
  }

  if (dashboardTechnicianSelect) {
    dashboardTechnicianSelect.selectedIndex = 0;
  }

  dashboardSelectedMaintenanceId = null;
}

async function assignTechnician() {
  if (!dashboardSelectedMaintenanceId) {
    showToast("No maintenance request selected.", "error");

    return;
  }

  const technicianId = dashboardTechnicianSelect?.value;

  if (!technicianId) {
    showToast("Please select a technician.", "error");

    return;
  }

  setButtonPending(dashboardAssignTechnicianBtn, true);

  try {
    const response = await fetch(
      `/maintenance/${dashboardSelectedMaintenanceId}/assign`,

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

    showToast(data.message || "Technician assigned successfully", "success");

    closeAssignModal();

    await loadPendingMaintenance();

    await loadDashboardStats();
  } catch (error) {
    console.error(error);

    showToast(error.message || "Assignment failed.", "error");
  } finally {
    setButtonPending(dashboardAssignTechnicianBtn, false);
  }
}

const profileTrigger = document.querySelector(".profile-trigger");
const profileDropdown = document.querySelector("#profileDropdown");

if (profileTrigger && profileDropdown) {
  profileTrigger.addEventListener("click", (event) => {
    event.stopPropagation();

    profileDropdown.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    profileDropdown.classList.remove("show");
  });
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    location.reload();
  }
});
