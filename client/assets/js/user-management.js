const userTableBody = document.querySelector("#userTableBody");
const registerUserBtn = document.querySelector("#registerUserBtn");
const userModal = document.querySelector("#userModal");
const cancelUser = document.querySelector("#cancelUser");
const saveUser = document.querySelector("#saveUser");
const searchUser = document.querySelector("#searchUser");
const fullName = document.querySelector("#fullName");
const email = document.querySelector("#email");
const phoneNumber = document.querySelector("#phoneNumber");
const department = document.querySelector("#department");
const role = document.querySelector("#role");
const password = document.querySelector("#password");
const status = document.querySelector("#status");

let editingUserId = null;
let isEditing = false;

registerUserBtn.addEventListener("click", () => {
  isEditing = false;
  editingUserId = null;
  saveUser.textContent = "Save User";
  password.style.display = "block";
  password.value = "";
  fullName.value = "";
  email.value = "";
  phoneNumber.value = "";
  department.value = "";
  role.value = "";
  status.value = "Active";
  userModal.style.display = "flex";
});

cancelUser.addEventListener("click", () => {
  userModal.style.display = "none";
});

function loadUsers() {
  userTableBody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;">Loading users...</td>
    </tr>
  `;

  fetch("/users")
    .then((response) => response.json())

    .then((users) => {
      renderUsers(users);
    })

    .catch((error) => {
      console.error(error);
      userTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;">Failed to load users. Please try again.</td>
        </tr>
      `;
    });
}

// toClass, escapeHtml — provided by api.js

function renderUsers(users) {
  userTableBody.innerHTML = "";

  const keyword = searchUser.value.toLowerCase();

  const filteredUsers = users.filter((user) => {
    return (
      user.full_name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.department.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword)
    );
  });

  if (filteredUsers.length === 0) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">No users found.</td>
      </tr>
    `;
    return;
  }

  filteredUsers.forEach((user) => {
    const row = document.createElement("tr");
    const statusClass = toClass(user.status);

    row.innerHTML = `

          <td>${escapeHtml(user.full_name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.phone_number) || "-"}</td>
          <td>${escapeHtml(user.department) || "-"}</td>
          <td>${escapeHtml(user.role)}</td>
          <td>
              <span class="status-badge status-${statusClass}">
                  ${escapeHtml(user.status)}
              </span>
          </td>
          <td>
              <button class="edit-btn" data-id="${user.id}">
                  <i class="fas fa-pen"></i>
                  Edit
              </button>
              <button class="status-btn"
                  data-id="${user.id}"
                  data-status="${user.status}">
                  ${user.status === "Active" ? "Deactivate" : "Activate"}
              </button>
          </td>
      `;

    userTableBody.appendChild(row);

    const editBtn = row.querySelector(".edit-btn");

    editBtn.addEventListener("click", () => {
      fetch(`/users/${user.id}`)
        .then((response) => response.json())

        .then((userData) => {
          editingUserId = userData.id;
          isEditing = true;

          fullName.value = userData.full_name;
          email.value = userData.email;
          phoneNumber.value = userData.phone_number || "";
          department.value = userData.department || "";
          role.value = userData.role;
          status.value = userData.status;
          password.value = "";
          password.style.display = "none";
          saveUser.textContent = "Update User";
          userModal.style.display = "flex";
        })

        .catch((error) => {
          console.error(error);

          showToast("Failed to load user.", "error");
        });
    });

    const statusBtn = row.querySelector(".status-btn");

    statusBtn.addEventListener("click", () => {
      const newStatus = user.status === "Active" ? "Inactive" : "Active";

      showConfirmModal({
        title: "Change User Status",
        message: `Change ${user.full_name}'s status to ${newStatus}?`,
        confirmText: newStatus === "Inactive" ? "Deactivate" : "Activate",
        onConfirm: () => {
          fetch(`/users/status/${user.id}`, {
            method: "PUT",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              status: newStatus,
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

              loadUsers();
            })

            .catch((error) => {
              console.error(error);

              showToast(error.message, "error");
            });
        },
      });
    });
  });
}

loadUsers();

searchUser.addEventListener("input", () => {
  loadUsers();
});

saveUser.addEventListener("click", () => {
  if (
    !fullName.value.trim() ||
    !email.value.trim() ||
    !department.value.trim() ||
    !role.value
  ) {
    showToast("Please fill all required fields.", "warning");
    return;
  }

  if (!isEditing && !password.value.trim()) {
    showToast("Please enter a password.", "warning");
    return;
  }

  const url = isEditing ? `/users/${editingUserId}` : "/users";
  const method = isEditing ? "PUT" : "POST";

  fetch(url, {
    method,

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      full_name: fullName.value.trim(),
      email: email.value.trim(),
      phone_number: phoneNumber.value.trim(),
      department: department.value.trim(),
      role: role.value,
      status: status.value,
      password: password.value.trim(),
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

      userModal.style.display = "none";

      editingUserId = null;
      isEditing = false;

      saveUser.textContent = "Save User";
      password.style.display = "block";
      fullName.value = "";
      email.value = "";
      phoneNumber.value = "";
      department.value = "";
      role.value = "";
      status.value = "Active";
      password.value = "";

      loadUsers();
    })

    .catch((error) => {
      console.error(error);

      showToast(error.message, "error");
    });
});
