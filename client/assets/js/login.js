const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const rememberMeInput = document.querySelector("#rememberMe");
const eyeIcon = document.querySelector(".eye-icon");
const loginAlert = document.querySelector("#loginAlert");

const forgotLink = document.querySelector("#forgotLink");
const forgotPasswordModal = document.querySelector("#forgotPasswordModal");
const forgotModalClose = document.querySelector("#forgotModalClose");
const forgotModalCancel = document.querySelector("#forgotModalCancel");
const forgotPasswordForm = document.querySelector("#forgotPasswordForm");
const resetEmailInput = document.querySelector("#resetEmail");
const forgotModalAlert = document.querySelector("#forgotModalAlert");
const sendResetLinkBtn = document.querySelector("#sendResetLink");

function showLoginBanner(message, type = "error") {
  if (!loginAlert) return;

  loginAlert.classList.remove("login-alert--error", "login-alert--success");
  loginAlert.classList.add(
    type === "success" ? "login-alert--success" : "login-alert--error",
  );
  loginAlert.textContent =
    message || (type === "success" ? "Success." : "Invalid email or password.");
  loginAlert.hidden = false;
}

function clearLoginError() {
  if (!loginAlert) return;

  loginAlert.textContent = "";
  loginAlert.classList.remove("login-alert--error", "login-alert--success");
  loginAlert.hidden = true;
}

function handleLogoutSuccess() {
  if (!window.location.search) return;

  const params = new URLSearchParams(window.location.search);

  if (params.get("logout") !== "success") return;

  showLoginBanner("You have been logged out successfully.", "success");

  window.history.replaceState(null, "", window.location.pathname);
}

eyeIcon.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
  }
});

emailInput.addEventListener("input", clearLoginError);
passwordInput.addEventListener("input", clearLoginError);

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearLoginError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginBanner("Please enter both your email and password.", "error");
    return;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    showLoginBanner("Please enter a valid email address.", "error");
    return;
  }

  setButtonPending(loginForm.querySelector('button[type="submit"]'), true);
  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      remember: rememberMeInput ? rememberMeInput.checked : false,
    }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        const error = new Error(
          data.message || "Invalid email or password.",
        );
        error.status = response.status;
        throw error;
      }

      if (!response.ok) {
        const error = new Error(data.message || "Login failed.");
        error.status = response.status;
        throw error;
      }

      return data;
    })
    .then(() => {
      window.location.href = "/dashboard";
    })
    .catch((error) => {
      showLoginBanner(error.message || "Invalid email or password.", "error");
    })
    .finally(() => {
      setButtonPending(loginForm.querySelector('button[type="submit"]'), false);
    });
});

function showModalFeedback(message, type) {
  if (!forgotModalAlert) return;

  forgotModalAlert.textContent = message;
  forgotModalAlert.classList.remove(
    "modal-alert--error",
    "modal-alert--success",
  );
  forgotModalAlert.classList.add(
    type === "success" ? "modal-alert--success" : "modal-alert--error",
  );
  forgotModalAlert.hidden = false;
}

function openForgotModal() {
  if (!forgotPasswordModal) return;

  forgotPasswordForm.reset();
  forgotModalAlert.textContent = "";
  forgotModalAlert.classList.remove("modal-alert--error", "modal-alert--success");
  forgotModalAlert.hidden = true;
  sendResetLinkBtn.disabled = false;
  sendResetLinkBtn.classList.remove("is-loading");

  forgotPasswordModal.classList.add("open");

  if (resetEmailInput) resetEmailInput.focus();
}

function closeForgotModal() {
  if (!forgotPasswordModal) return;

  forgotPasswordModal.classList.remove("open");
}

forgotLink.addEventListener("click", (event) => {
  event.preventDefault();
  openForgotModal();
});

forgotModalClose.addEventListener("click", closeForgotModal);
forgotModalCancel.addEventListener("click", closeForgotModal);

forgotPasswordModal.addEventListener("click", (event) => {
  if (event.target === forgotPasswordModal) {
    closeForgotModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    forgotPasswordModal.classList.contains("open")
  ) {
    closeForgotModal();
  }
});

forgotPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = resetEmailInput.value.trim();

  if (!email) {
    showModalFeedback("Please enter your email address.", "error");
    return;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    showModalFeedback("Please enter a valid email address.", "error");
    return;
  }

  sendResetLinkBtn.disabled = true;
  sendResetLinkBtn.classList.add("is-loading");

  fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(
          data.message || "Something went wrong. Please try again.",
        );
        throw error;
      }

      return data;
    })
    .then((data) => {
      showModalFeedback(
        data.message || "Password reset link sent to your email address.",
        "success",
      );
    })
    .catch((error) => {
      showModalFeedback(
        error.message || "Something went wrong. Please try again.",
        "error",
      );
    })
    .finally(() => {
      sendResetLinkBtn.disabled = false;
      sendResetLinkBtn.classList.remove("is-loading");
    });
});

handleLogoutSuccess();
