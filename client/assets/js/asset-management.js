const assignModal = document.querySelector("#assignModal");
const assignUser = document.querySelector("#assignUser");
const assignAssetName = document.querySelector("#assignAssetName");
const cancelAssign = document.querySelector("#cancelAssign");
const confirmAssign = document.querySelector("#confirmAssign");
const historyModal = document.querySelector("#historyModal");
const historyContent = document.querySelector("#historyContent");
const closeHistory = document.querySelector("#closeHistory");

let assigningAssetId = null;
let editingAssetId = null;
let isEditing = false;

const assetModal = document.querySelector("#assetModal");
const registerAssetBtn = document.querySelector("#registerAssetBtn");
const cancelAsset = document.querySelector("#cancelAsset");
const categorySelect = document.querySelector("#category");
const saveAsset = document.querySelector("#saveAsset");
const assetTag = document.querySelector("#assetTag");
const barcode = document.querySelector("#barcode");
const assetName = document.querySelector("#assetName");
const brand = document.querySelector("#brand");
const model = document.querySelector("#model");
const serialNumber = document.querySelector("#serialNumber");
const purchaseDate = document.querySelector("#purchaseDate");
const condition = document.querySelector("#condition");
const locationInput = document.querySelector("#location");
const assetTableBody = document.querySelector("#assetTableBody");
const searchAsset = document.querySelector("#searchAsset");
const statusFilter = document.querySelector("#statusFilter");
const categoryFilter = document.querySelector("#categoryFilter");

function loadCategories() {
  fetch("/asset-categories")
    .then((response) => response.json())
    .then((categories) => {
      categorySelect.innerHTML = '<option value="">Select Category</option>';

      categoryFilter.innerHTML = '<option value="">All Categories</option>';

      categories.forEach((category) => {
        const option1 = document.createElement("option");
        option1.value = category.id;
        option1.textContent = category.category_name;
        categorySelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = category.category_name;
        option2.textContent = category.category_name;
        categoryFilter.appendChild(option2);
      });
    })
    .catch((error) => {
      console.error(error);
      showToast("Failed to load asset categories.", "error");
    });
}

function loadUsers() {
  fetch("/users")
    .then((response) => response.json())
    .then((users) => {
      assignUser.innerHTML = '<option value="">Select Employee</option>';

      users.forEach((user) => {
        if (user.role !== "Staff" || user.status !== "Active") {
          return;
        }

        const option = document.createElement("option");

        option.value = user.id;

        option.textContent = `${user.full_name} (${user.role})`;

        assignUser.appendChild(option);
      });
    })
    .catch((error) => {
      console.error(error);

      showToast("Failed to load users.", "error");
    });
}

registerAssetBtn.addEventListener("click", () => {
  isEditing = false;
  editingAssetId = null;

  assetTag.value = "";
  barcode.value = "";
  assetName.value = "";
  categorySelect.value = "";
  brand.value = "";
  model.value = "";
  serialNumber.value = "";
  purchaseDate.value = "";
  condition.value = "Good";
  locationInput.value = "";

  saveAsset.textContent = "Save Asset";

  assetModal.style.display = "flex";
});

cancelAsset.addEventListener("click", () => {
  assetModal.style.display = "none";
});

cancelAssign.addEventListener("click", () => {
  assignModal.style.display = "none";
  assignUser.value = "";
  assignAssetName.value = "";
});

confirmAssign.addEventListener("click", () => {
  if (!assignUser.value) {
    showToast("Please select an employee.", "warning");
    return;
  }

  setButtonPending(confirmAssign, true);

  fetch("/assets/assign", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      asset_id: assigningAssetId,

      user_id: assignUser.value,
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
      assignModal.style.display = "none";
      assignUser.value = "";
      assignAssetName.value = "";
      assigningAssetId = null;
      loadAssets();
    })

    .catch((error) => {
      console.error(error);
      showToast(error.message, "error");
    })
    .finally(() => {
      setButtonPending(confirmAssign, false);
    });
});

saveAsset.addEventListener("click", () => {
  if (
    !assetTag.value.trim() ||
    !assetName.value.trim() ||
    !categorySelect.value
  ) {
    showToast("Please fill all required fields.", "warning");
    return;
  }

  const url = isEditing ? `/assets/${editingAssetId}` : "/assets/register";

  const method = isEditing ? "PUT" : "POST";

  setButtonPending(saveAsset, true);

  fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      asset_tag: assetTag.value.trim(),
      barcode: barcode.value.trim(),
      asset_name: assetName.value.trim(),
      category_id: categorySelect.value,
      brand: brand.value.trim(),
      model: model.value.trim(),
      serial_number: serialNumber.value.trim(),
      purchase_date: purchaseDate.value,
      asset_condition: condition.value,
      location: locationInput.value.trim(),
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
      assetModal.style.display = "none";

      isEditing = false;
      editingAssetId = null;

      saveAsset.textContent = "Save Asset";
      loadAssets();
    })

    .catch((error) => {
      console.error(error);

      showToast(error.message, "error");
    })
    .finally(() => {
      setButtonPending(saveAsset, false);
    });
});

loadCategories();
loadAssets();
loadUsers();

// toClass, escapeHtml — provided by api.js

function loadAssets() {
  assetTableBody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;">Loading assets...</td>
    </tr>
  `;

  fetch("/assets")
    .then((response) => response.json())
    .then((assets) => {
      assetTableBody.innerHTML = "";

      const keyword = searchAsset.value.toLowerCase();
      const selectedStatus = statusFilter.value;
      const selectedCategory = categoryFilter.value;

      const filteredAssets = assets.filter((asset) => {
        const matchesSearch =
          asset.asset_tag.toLowerCase().includes(keyword) ||
          asset.asset_name.toLowerCase().includes(keyword) ||
          asset.category_name.toLowerCase().includes(keyword);

        const matchesStatus =
          selectedStatus === "" || asset.status === selectedStatus;

        const matchesCategory =
          selectedCategory === "" || asset.category_name === selectedCategory;

        return matchesSearch && matchesStatus && matchesCategory;
      });

      if (filteredAssets.length === 0) {
        assetTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center;">No assets found.</td>
          </tr>
        `;
        return;
      }

      filteredAssets.forEach((asset) => {
        const row = document.createElement("tr");

        let actionButton = "";

        if (asset.status === "In Stock") {
          actionButton = `
      <button class="assign-btn" data-id="${asset.id}">
        <i class="fas fa-user-check"></i> Assign
      </button>
    `;
        }

        if (asset.status === "Assigned") {
          actionButton = `
      <button class="return-btn" data-id="${asset.id}">
        <i class="fas fa-rotate-left"></i> Return
      </button>
    `;
        }

        if (asset.status === "Under Maintenance") {
          actionButton = `
          <button
              class="maintenance-btn"
              data-id="${asset.id}">
              <i class="fas fa-screwdriver-wrench"></i>
              View
          </button>
        `;
        }

        const statusClass = toClass(asset.status);

        row.innerHTML = `
    <td><span class="asset-tag">${escapeHtml(asset.asset_tag)}</span></td>
    <td>${escapeHtml(asset.asset_name)}</td>
    <td>${escapeHtml(asset.category_name)}</td>
    <td>${escapeHtml(asset.asset_condition)}</td>
    <td><span class="status-badge status-${statusClass}">${escapeHtml(asset.status)}</span></td>
    <td>${escapeHtml(asset.assigned_to) || "Not Assigned"}</td>

    <td>

      <button class="edit-btn" data-id="${asset.id}">
        <i class="fas fa-pen"></i> Edit
      </button>

      <button class="history-btn" data-id="${asset.id}">
        <i class="fas fa-clock-rotate-left"></i> History
      </button>

      ${actionButton}

    </td>
  `;

        assetTableBody.appendChild(row);

        row.querySelector(".edit-btn").addEventListener("click", () => {
          fetch(`/assets/${asset.id}`)
            .then((response) => response.json())
            .then((assetData) => {
              editingAssetId = assetData.id;
              isEditing = true;

              assetTag.value = assetData.asset_tag;
              barcode.value = assetData.barcode;
              assetName.value = assetData.asset_name;
              categorySelect.value = assetData.category_id;
              brand.value = assetData.brand;
              model.value = assetData.model;
              serialNumber.value = assetData.serial_number;
              purchaseDate.value = assetData.purchase_date || "";
              condition.value = assetData.asset_condition;
              locationInput.value = assetData.location;

              saveAsset.textContent = "Update Asset";

              assetModal.style.display = "flex";
            })
            .catch((error) => {
              console.error(error);

              showToast("Failed to load asset.", "error");
            });
        });

        const assignBtn = row.querySelector(".assign-btn");

        if (assignBtn) {
          assignBtn.addEventListener("click", () => {
            assigningAssetId = asset.id;

            assignAssetName.value = asset.asset_name;

            assignModal.style.display = "flex";
          });
        }

        const returnBtn = row.querySelector(".return-btn");

        if (returnBtn) {
          returnBtn.addEventListener("click", () => {
            showConfirmModal({
              title: "Return Asset",
              message: `Return "${asset.asset_name}" to inventory?`,
              confirmText: "Return",
              onConfirm: () => {
                fetch("/assets/return", {
                  method: "POST",

                  headers: {
                    "Content-Type": "application/json",
                  },

                  body: JSON.stringify({
                    asset_id: asset.id,
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

                    loadAssets();
                  })
                  .catch((error) => {
                    console.error(error);

                    showToast(error.message, "error");
                  });
              },
            });
          });
        }

       const maintenanceBtn = row.querySelector(".maintenance-btn");

       if (maintenanceBtn) {
         maintenanceBtn.addEventListener("click", () => {
           fetch(`/maintenance/latest-for-asset/${asset.id}`)
             .then((response) => response.json())
             .then((data) => {
               if (data.id) {
                 window.location.href = `/maintenance-details?id=${data.id}`;
               } else {
                 showToast("No maintenance record found for this asset.", "info");
               }
             })
             .catch((error) => {
               console.error(error);
               showToast("Failed to load maintenance details.", "error");
             });
         });
       }

        const historyBtn = row.querySelector(".history-btn");

        historyBtn.addEventListener("click", () => {
          fetch(`/assets/${asset.id}/history`)
            .then((response) => response.json())
            .then((history) => {
              historyContent.innerHTML = "";

              var fragment = document.createDocumentFragment();

              history.forEach((record) => {
                var wrapper = document.createElement("div");
                wrapper.className = "timeline-item";

                var card = document.createElement("div");
                card.className = "timeline-card";

                var h4 = document.createElement("h4");
                h4.textContent = record.staff_name || "";
                card.appendChild(h4);

                var assignedBy = document.createElement("p");
                assignedBy.innerHTML = "<strong>Assigned By:</strong> " + escapeHtml(record.assigned_by_name);
                card.appendChild(assignedBy);

                var assignedDate = document.createElement("p");
                assignedDate.innerHTML = "\uD83D\uDCC5 <strong>Assigned:</strong> " + escapeHtml(record.assigned_date);
                card.appendChild(assignedDate);

                var returned = document.createElement("p");
                returned.innerHTML = "\uD83D\uDCE6 <strong>Returned:</strong> " + (record.returned_date ? escapeHtml(record.returned_date) : "Currently Assigned");
                card.appendChild(returned);

                var statusSpan = document.createElement("span");
                statusSpan.className = "timeline-status " + toClass(record.assignment_status);
                statusSpan.textContent = record.assignment_status || "";
                card.appendChild(statusSpan);

                wrapper.appendChild(card);
                fragment.appendChild(wrapper);
              });

              historyContent.appendChild(fragment);
              historyModal.style.display = "flex";
            })
            .catch((error) => {
              console.error(error);

              showToast("Failed to load asset history.", "error");
            });
        });
      });
    })
    .catch((error) => {
      console.error(error);
      assetTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;">Failed to load assets. Please try again.</td>
        </tr>
      `;
    });
}

closeHistory.addEventListener("click", () => {
  historyModal.style.display = "none";
});

assetTag.value = "";
barcode.value = "";
assetName.value = "";
categorySelect.value = "";
brand.value = "";
model.value = "";
serialNumber.value = "";
purchaseDate.value = "";
condition.value = "Good";
locationInput.value = "";

searchAsset.addEventListener("input", () => {
  loadAssets();
});

statusFilter.addEventListener("change", loadAssets);

categoryFilter.addEventListener("change", loadAssets);
