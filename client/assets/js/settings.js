// fetchJson, setButtonPending — provided by api.js

const feedbackTimers = new Map();

function hideFeedback(feedbackEl) {
  if (!feedbackEl) return;

  feedbackEl.className = "form-message";
  feedbackEl.textContent = "";

  if (feedbackTimers.has(feedbackEl)) {
    clearTimeout(feedbackTimers.get(feedbackEl));
    feedbackTimers.delete(feedbackEl);
  }
}

function showFeedback(feedbackEl, message, type = "success") {
  if (!feedbackEl) return;

  if (feedbackTimers.has(feedbackEl)) {
    clearTimeout(feedbackTimers.get(feedbackEl));
    feedbackTimers.delete(feedbackEl);
  }

  feedbackEl.textContent = message;
  feedbackEl.className = `form-message show ${type}`;

  if (type === "success") {
    feedbackTimers.set(
      feedbackEl,
      setTimeout(() => hideFeedback(feedbackEl), 4000),
    );
  }
}

const ROLE_PREFERENCE_ITEMS = {
  Staff: [
    {
      key: "notify_request_updates",
      title: "Request Updates",
      description:
        "Get notified when your submitted maintenance requests change status.",
    },
    {
      key: "notify_completions",
      title: "Completed Requests",
      description: "Get notified when your request is marked completed.",
    },
  ],
  Technician: [
    {
      key: "notify_assignments",
      title: "New Job Assignments",
      description: "Get notified when a maintenance job is assigned to you.",
    },
    {
      key: "notify_job_status",
      title: "Job Status Updates",
      description:
        "Get notified when an assigned job is updated or canceled.",
    },
  ],
  Admin: [
    {
      key: "notify_requests",
      title: "New Maintenance Requests",
      description: "Get notified when any new request is submitted.",
    },
    {
      key: "notify_critical",
      title: "Completed / Critical Job Alerts",
      description:
        "Get notified when maintenance jobs are completed or assets are flagged Out of Service.",
    },
  ],
};

let currentUserRole = null;

async function loadSettings() {
  const [profile, preferences] = await Promise.all([
    fetchJson("/me/profile"),
    fetchJson("/notifications/preferences"),
  ]);

  renderAccountSummary(profile);
  fillProfileForm(profile);
  renderPreferences(profile.role, preferences);
}

function renderAccountSummary(profile) {
  const fullName = document.querySelector("#settingsFullName");
  const email = document.querySelector("#settingsEmail");
  const role = document.querySelector("#settingsRole");
  const department = document.querySelector("#settingsDepartment");
  const status = document.querySelector("#settingsStatus");
  const memberSince = document.querySelector("#settingsMemberSince");

  if (fullName) fullName.textContent = profile.full_name || "-";
  if (email) email.textContent = profile.email || "-";
  if (role) role.textContent = profile.role || "-";
  if (department) department.textContent = profile.department || "-";

  if (status) {
    const statusClass =
      profile.status === "Inactive" ? "status-inactive" : "status-active";
    status.innerHTML = `
      <span class="status-badge ${statusClass}">
        ${escapeHtml(profile.status || "Unknown")}
      </span>
    `;
  }

  if (memberSince) memberSince.textContent = formatDate(profile.created_at);
}

function fillProfileForm(profile) {
  const fullNameInput = document.querySelector("#profileFullNameInput");
  const phoneInput = document.querySelector("#profilePhoneInput");

  if (fullNameInput) fullNameInput.value = profile.full_name || "";
  if (phoneInput) phoneInput.value = profile.phone_number || "";
}

function renderPreferences(role, preferences) {
  const container = document.querySelector("#preferenceList");
  if (!container) return;

  currentUserRole = role;

  const items = ROLE_PREFERENCE_ITEMS[role] || ROLE_PREFERENCE_ITEMS.Staff;

  container.innerHTML = items
    .map(
      (item) => `
        <div class="pref-row">
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              data-pref-key="${item.key}"
              ${preferences[item.key] === 1 ? "checked" : ""}
            />
            <span class="slider"></span>
          </label>
        </div>
      `,
    )
    .join("");
}

function setupProfileForm() {
  const profileForm = document.querySelector("#profileForm");

  if (!profileForm) return;

  const saveBtn = document.querySelector("#saveProfileBtn");
  const feedback = document.querySelector("#profileFeedback");

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullNameInput = document.querySelector("#profileFullNameInput");
    const phoneInput = document.querySelector("#profilePhoneInput");

    if (!fullNameInput.value.trim()) {
      showFeedback(feedback, "Full name is required.", "error");
      fullNameInput.focus();
      return;
    }

    setButtonPending(saveBtn, true);

    try {
      await fetchJson("/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullNameInput.value,
          phone_number: phoneInput.value,
        }),
      });

      showFeedback(feedback, "Profile updated successfully.", "success");

      try {
        await loadSettings();
        await loadCurrentUser();
      } catch (refreshError) {
        console.error(refreshError);
      }
    } catch (error) {
      console.error(error);
      showFeedback(feedback, error.message, "error");
    } finally {
      setButtonPending(saveBtn, false);
    }
  });
}

function setupPreferenceToggles() {
  const toggles = document.querySelectorAll("[data-pref-key]");
  const feedback = document.querySelector("#prefsFeedback");

  if (toggles.length === 0) return;

  let saving = false;

  toggles.forEach((toggle) => {
    toggle.addEventListener("change", async () => {
      if (saving) {
        toggle.checked = !toggle.checked;
        return;
      }

      saving = true;
      toggles.forEach((t) => (t.disabled = true));

      try {
        const preferences = {};

        toggles.forEach((t) => {
          preferences[t.dataset.prefKey] = t.checked ? 1 : 0;
        });

        await fetchJson("/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });

        showFeedback(feedback, "Notification preferences updated.", "success");
      } catch (error) {
        console.error(error);
        showFeedback(feedback, error.message, "error");

        try {
          renderPreferences(
            currentUserRole,
            await fetchJson("/notifications/preferences"),
          );
        } catch (fetchError) {
          console.error(fetchError);
        }
      } finally {
        saving = false;
        toggles.forEach((t) => (t.disabled = false));
      }
    });
  });
}

function setupChangePassword() {
  const changePasswordForm = document.querySelector("#changePasswordForm");
  const currentPassword = document.querySelector("#currentPassword");
  const newPassword = document.querySelector("#newPassword");
  const confirmPassword = document.querySelector("#confirmPassword");
  const submitBtn = document.querySelector("#submitPasswordChange");
  const feedback = document.querySelector("#passwordFeedback");

  if (!changePasswordForm) return;

  const confirmHint = document.querySelector("#confirmPasswordHint");

  function updateConfirmHint() {
    if (!confirmHint) return;

    if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
      confirmHint.textContent = "Passwords do not match.";
      confirmHint.classList.add("error");
      confirmHint.hidden = false;
    } else {
      confirmHint.hidden = true;
      confirmHint.classList.remove("error");
    }
  }

  newPassword.addEventListener("input", updateConfirmHint);
  confirmPassword.addEventListener("input", updateConfirmHint);

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (newPassword.value.length < 8) {
      showFeedback(
        feedback,
        "New password must be at least 8 characters.",
        "error",
      );
      newPassword.focus();
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      showFeedback(
        feedback,
        "New password and confirmation do not match.",
        "error",
      );
      confirmPassword.focus();
      return;
    }

    setButtonPending(submitBtn, true);

    try {
      const data = await fetchJson("/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword.value,
          newPassword: newPassword.value,
        }),
      });

      showFeedback(feedback, data.message, "success");
      changePasswordForm.reset();
      updateConfirmHint();
    } catch (error) {
      console.error(error);
      showFeedback(feedback, error.message, "error");
    } finally {
      setButtonPending(submitBtn, false);
    }
  });
}

async function initSettings() {
  try {
    await loadSettings();
  } catch (error) {
    console.error(error);
  }

  setupProfileForm();
  setupPreferenceToggles();
  setupChangePassword();
}

initSettings();
