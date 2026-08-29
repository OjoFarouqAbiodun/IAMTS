const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

const isPageRequest = (req) => {
  const accept = req.headers.accept || "";
  return req.method === "GET" && accept.includes("text/html") && !req.xhr;
};

const normalizeRole = (role) => (role === "User" ? "Staff" : role);

const sendUnauthorized = (req, res) => {
  AuditLog.record({
    category: "RBAC",
    action: "UNAUTHENTICATED",
    outcome: "denied",
    detail: { reason: "not_authenticated", method: req.method, path: req.path },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  if (isPageRequest(req)) {
    return res.redirect("/");
  }
  return res.status(401).json({
    error: "Unauthorized access",
    message: "Unauthorized access",
  });
};

const sendForbidden = (req, res) => {
  AuditLog.record({
    actorUserId: req.user ? req.user.id : null,
    actorRole: req.user ? req.user.role : null,
    category: "RBAC",
    action: "FORBIDDEN",
    outcome: "denied",
    detail: { reason: "role_denied", method: req.method, path: req.path },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  if (isPageRequest(req)) {
    return res.redirect("/dashboard");
  }
  return res.status(403).json({
    error: "Forbidden: Insufficient permissions",
    message: "Forbidden: Insufficient permissions",
  });
};

const terminateSession = (req, res) => {
  const sessionUserId =
    req.session && req.session.user ? req.session.user.id : null;
  AuditLog.record({
    actorUserId: sessionUserId,
    actorRole: req.session && req.session.user ? req.session.user.role : null,
    category: "SESSION",
    action: "SESSION_TERMINATED",
    outcome: "denied",
    targetType: "users",
    targetId: sessionUserId ? String(sessionUserId) : null,
    detail: { reason: "inactive_or_missing", method: req.method, path: req.path },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  req.session.destroy(() => {
    if (isPageRequest(req)) {
      return res.redirect("/");
    }
    return res.status(401).json({
      error: "Unauthorized access",
      message: "Not authenticated",
    });
  });
};

const authenticate = (req, res, next) => {
  if (!req.session.user) {
    return sendUnauthorized(req, res);
  }

  User.getUserById(req.session.user.id, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return terminateSession(req, res);
    }

    const user = results[0];

    if (user.status !== "Active") {
      return terminateSession(req, res);
    }

    if (
      user.role !== req.session.user.role ||
      user.full_name !== req.session.user.full_name ||
      user.email !== req.session.user.email
    ) {
      req.session.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      };
    }

    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    next();
  });
};

const checkRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(req, res);
    }

    if (!normalizedAllowed.includes(normalizeRole(req.user.role))) {
      return sendForbidden(req, res);
    }

    next();
  };
};

module.exports = {
  authenticate,
  checkRole,
  requireLogin: authenticate,
  requireRole: checkRole,
};
