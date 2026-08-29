const maintenanceForm = document.querySelector("#maintenanceForm");
const assetDropdown = document.querySelector("#asset");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const priorityInput = document.querySelector("#priority");
const requestFeedback = document.querySelector("#requestFeedback");
const submitBtn = document.querySelector("#submitRequest");

function setFieldError(input, message) {
  if (!input) return;

  const group = input.closest(".form-group");
  const errorEl = group ? group.querySelector(".form-error") : null;

  if (errorEl) {
    errorEl.textContent = message || "";
  }

  input.classList.toggle("input-error", Boolean(message));
}

function clearAllFieldErrors() {
  document.querySelectorAll(".form-group .form-error").forEach((el) => {
    el.textContent = "";
  });

  document.querySelectorAll(".form-group .input-error").forEach((el) => {
    el.classList.remove("input-error");
  });
}

function showFormMessage(message, type) {
  if (!requestFeedback) return;

  requestFeedback.textContent = message;
  requestFeedback.className = `form-message show ${type}`;
}

function hideFormMessage() {
  if (!requestFeedback) {
    return;
  }

  requestFeedback.className = "form-message";
  requestFeedback.textContent = "";
}

function validateForm() {
  let valid = true;

  const assetValue = assetDropdown.value;
  if (!assetValue) {
    setFieldError(assetDropdown, "Please select an asset.");
    valid = false;
  } else {
    setFieldError(assetDropdown, "");
  }

  const titleValue = titleInput.value.trim();
  if (!titleValue) {
    setFieldError(titleInput, "Problem title is required.");
    valid = false;
  } else {
    setFieldError(titleInput, "");
  }

  const descriptionValue = descriptionInput.value.trim();
  if (!descriptionValue) {
    setFieldError(descriptionInput, "Description is required.");
    valid = false;
  } else {
    setFieldError(descriptionInput, "");
  }

  const priorityValue = priorityInput.value;
  if (!priorityValue || !["Low", "Medium", "High"].includes(priorityValue)) {
    setFieldError(priorityInput, "Please select a priority.");
    valid = false;
  } else {
    setFieldError(priorityInput, "");
  }

  return valid;
}

function wireLiveErrorClearing() {
  const fields = [
    assetDropdown,
    titleInput,
    descriptionInput,
    priorityInput,
  ];

  fields.forEach((field) => {
    if (!field) return;

    field.addEventListener(
      field.tagName === "SELECT" ? "change" : "input",
      () => {
        setFieldError(field, "");
        hideFormMessage();
      },
    );
  });
}

fetch("/my-assets")
  .then(async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Failed to load assets.");
    }

    return data;
  })
  .then((assets) => {
    assetDropdown.innerHTML = '<option value="">-- Select Asset --</option>';

    assets.forEach((asset) => {
      const option = document.createElement("option");

      option.value = asset.id;
      option.textContent = asset.asset_name;

      assetDropdown.appendChild(option);
    });
  })
  .catch((error) => {
    console.error(error);
    showFormMessage("Failed to load assets. Please refresh the page.", "error");
  });

maintenanceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  hideFormMessage();

  if (!validateForm()) {
    showFormMessage("Please fix the highlighted fields below.", "error");
    return;
  }

  const asset_id = assetDropdown.value;
  const problem_title = titleInput.value.trim();
  const problem_description = descriptionInput.value.trim();
  const priority = priorityInput.value;

  const payload = {
    asset_id,
    problem_title,
    problem_description,
    priority,
  };

  submitBtn.disabled = true;

  fetch("/maintenance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      return data;
    })
    .then((data) => {
      showFormMessage(
        data.message || "Maintenance request submitted successfully!",
        "success",
      );

      maintenanceForm.reset();
      clearAllFieldErrors();

      assetDropdown.selectedIndex = 0;
    })
    .catch((error) => {
      console.error(error);
      showFormMessage(
        error.message || "Something went wrong. Please try again.",
        "error",
      );
    })
    .finally(() => {
      submitBtn.disabled = false;
    });
});

wireLiveErrorClearing();
