(function () {
  "use strict";

  var CSRF_COOKIE = "csrf_token";
  var CSRF_HEADER = "X-CSRF-Token";
  var METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  var originalFetch = window.fetch;

  function getCookie(name) {
    var m = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
    );
    return m ? decodeURIComponent(m[1]) : "";
  }

  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === "string" ? input : input && input.url;
    var method = (init.method || (input && input.method) || "GET").toUpperCase();
    var sameOrigin =
      !url ||
      url.indexOf("://") === -1 ||
      url.indexOf(location.origin + "/") === 0;

    if (sameOrigin && METHODS.has(method)) {
      var token = getCookie(CSRF_COOKIE);
      if (token) {
        var headers = new Headers(init.headers || (input && input.headers));
        if (!headers.has(CSRF_HEADER)) {
          headers.set(CSRF_HEADER, token);
        }
        init.headers = headers;
      }
    }

    return originalFetch.call(this, input, init);
  };
})();
