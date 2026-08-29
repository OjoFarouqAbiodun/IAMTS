const changePasswordForm = document.querySelector("#changePasswordForm");
const currentPassword = document.querySelector("#currentPassword");
const newPassword = document.querySelector("#newPassword");
const confirmPassword = document.querySelector("#confirmPassword");

changePasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (newPassword.value.length < 8) {
    showToast("New password must be at least 8 characters.", "warning");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    showToast("New password and confirmation do not match.", "warning");
    return;
  }

  setButtonPending(changePasswordForm.querySelector('button[type="submit"]'), true);
  fetch("/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    }),
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
      changePasswordForm.reset();
    })
    .catch((error) => {
      console.error(error);
      showToast(error.message, "error");
    })
    .finally(() => {
      setButtonPending(changePasswordForm.querySelector('button[type="submit"]'), false);
    });
});
