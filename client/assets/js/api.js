(function () {
  "use strict";

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  function toClass(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    var date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    var day = String(date.getDate()).padStart(2, "0");
    var month = date.toLocaleString("en-GB", { month: "short" });
    var year = date.getFullYear();
    return day + "-" + month + "-" + year;
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, options);
    var data;
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }
    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }
    return data;
  }

  function setButtonPending(button, pending) {
    if (!button) return;
    if (pending) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = "Loading...";
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  window.escapeHtml = escapeHtml;
  window.toClass = toClass;
  window.formatDate = formatDate;
  window.fetchJson = fetchJson;
  window.setButtonPending = setButtonPending;
})();
