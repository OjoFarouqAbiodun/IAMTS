function loadProfile() {
  fetch("/me/profile")
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load profile.");
      }

      return data;
    })
    .then((user) => {
      const fullName = document.querySelector("#profileFullName");
      const email = document.querySelector("#profileEmail");
      const phone = document.querySelector("#profilePhone");
      const role = document.querySelector("#profileRole");
      const department = document.querySelector("#profileDepartment");
      const status = document.querySelector("#profileStatus");

      if (fullName) fullName.textContent = user.full_name || "-";
      if (email) email.textContent = user.email || "-";
      if (phone) phone.textContent = user.phone_number || "-";
      if (role) role.textContent = user.role || "-";
      if (department) department.textContent = user.department || "-";
      if (status) status.textContent = user.status || "-";
    })
    .catch((error) => {
      console.error(error);
      const rows = document.querySelectorAll(".details-grid .detail-row span");
      rows.forEach((row) => {
        row.textContent = "Failed to load profile.";
      });
    });
}

loadProfile();
