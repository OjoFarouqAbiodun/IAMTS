(function () {
  "use strict";

  var TOAST_ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
  };

  // escapeHtml provided by api.js via window.escapeHtml
  var escapeHtml = window.escapeHtml;

  function getToastContainer() {
    var container = document.getElementById("toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }

    return container;
  }

  function dismiss(toast) {
    if (!toast.parentNode) return;

    toast.classList.remove("toast--show");
    toast.classList.add("toast--hide");

    var remove = function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    };

    toast.addEventListener("animationend", remove, { once: true });
    setTimeout(remove, 600);
  }

  function showToast(message, type, duration) {
    type = type || "success";
    duration = typeof duration === "number" ? duration : 3000;

    var container = getToastContainer();
    var toast = document.createElement("div");
    toast.className = "toast toast--" + type;
    toast.setAttribute("role", "alert");

    var icon = TOAST_ICONS[type] || TOAST_ICONS.info;

    toast.innerHTML =
      '<i class="fa-solid ' + icon + ' toast__icon" aria-hidden="true"></i>' +
      '<span class="toast__message">' + window.escapeHtml(message) + "</span>";

    toast.addEventListener("click", function () {
      dismiss(toast);
    });

    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("toast--show");
    });

    setTimeout(function () {
      dismiss(toast);
    }, duration);
  }

  window.showToast = showToast;

  function showConfirmModal(options) {
    options = options || {};

    var title = options.title || "Are you sure?";
    var message = options.message || "";
    var confirmText = options.confirmText || "Confirm";
    var cancelText = options.cancelText || "Cancel";
    var danger = options.danger !== false;
    var onConfirm =
      typeof options.onConfirm === "function" ? options.onConfirm : function () {};

    var overlay = document.createElement("div");
    overlay.className = "modal show confirm-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    overlay.innerHTML =
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h3 class="modal-title">' + window.escapeHtml(title) + "</h3>" +
      '<button type="button" class="modal-close confirm-cancel" aria-label="Close">&times;</button>' +
      "</div>" +
      '<div class="modal-body">' + window.escapeHtml(message) + "</div>" +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-ghost confirm-cancel">' +
      window.escapeHtml(cancelText) +
      "</button>" +
      '<button type="button" class="btn ' +
      (danger ? "btn-danger" : "btn-primary") +
      ' confirm-ok">' +
      window.escapeHtml(confirmText) +
      "</button>" +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function close() {
      overlay.classList.remove("show");
      document.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = previousOverflow;
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    }

    function onKeydown(event) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeydown);

    var cancels = overlay.querySelectorAll(".confirm-cancel");
    for (var i = 0; i < cancels.length; i++) {
      cancels[i].addEventListener("click", close);
    }

    overlay.querySelector(".confirm-ok").addEventListener("click", function () {
      close();
      onConfirm();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
  }

  window.showConfirmModal = showConfirmModal;

  document.addEventListener("click", function (event) {
    var closeBtn = event.target.closest(".modal-close, .btn-close");
    if (!closeBtn) return;
    var modal = closeBtn.closest(".modal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.style.display = "none";
  });
})();
