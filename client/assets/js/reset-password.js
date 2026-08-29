const resetForm = document.querySelector("#resetForm");
const newPasswordInput = document.querySelector("#newPassword");
const confirmPasswordInput = document.querySelector("#confirmPassword");
const resetAlert = document.querySelector("#resetAlert");
const resetSubmitBtn = document.querySelector("#resetSubmitBtn");
const eyeIcon = document.querySelector(".eye-icon");

const params = new URLSearchParams(window.location.search);
const resetToken = params.get("token");

function showAlert(message, type = "error") {
  if (!resetAlert) return;

  resetAlert.classList.remove("login-alert--error", "login-alert--success");
  resetAlert.classList.add(
    type === "success" ? "login-alert--success" : "login-alert--error",
  );
  resetAlert.textContent = message;
  resetAlert.hidden = false;
}

function clearAlert() {
  if (!resetAlert) return;

  resetAlert.textContent = "";
  resetAlert.classList.remove("login-alert--error", "login-alert--success");
  resetAlert.hidden = true;
}

if (!resetToken) {
  if (resetForm) resetForm.hidden = true;
  showAlert(
    "This password reset link is invalid or incomplete. Please request a new one.",
    "error",
  );
} else {
  if (eyeIcon) {
    eyeIcon.addEventListener("click", () => {
      if (newPasswordInput.type === "password") {
        newPasswordInput.type = "text";
        eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        newPasswordInput.type = "password";
        eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  }

  newPasswordInput.addEventListener("input", clearAlert);
  confirmPasswordInput.addEventListener("input", clearAlert);

  resetForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearAlert();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || newPassword.length < 8) {
      showAlert("New password must be at least 8 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match.", "error");
      return;
    }

    resetSubmitBtn.disabled = true;
    resetSubmitBtn.classList.add("is-loading");

    fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const error = new Error(
            data.message || "Unable to reset your password.",
          );
          throw error;
        }

        return data;
      })
      .then(() => {
        if (resetForm) resetForm.hidden = true;
        showAlert(
          "Your password has been reset successfully. You can now sign in.",
          "success",
        );
      })
      .catch((error) => {
        showAlert(error.message || "Unable to reset your password.", "error");
      })
      .finally(() => {
        resetSubmitBtn.disabled = false;
        resetSubmitBtn.classList.remove("is-loading");
      });
  });
}
