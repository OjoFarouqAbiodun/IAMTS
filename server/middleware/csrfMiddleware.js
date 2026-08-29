const crypto = require("crypto");
const AuditLog = require("../models/AuditLog");

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXCLUDED_PATHS = new Set(["/login", "/api/auth/forgot-password"]);
const DEFAULT_MAX_AGE = 1000 * 60 * 60 * 8;

const isSecureEnv = () =>
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

const readCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1 && part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const setCsrfTokenCookie = (res, maxAge) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isSecureEnv(),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return token;
};

const ensureCsrfCookie = (req, res, next) => {
  if (req.method === "POST" && req.path === "/login") {
    return next();
  }
  if (!readCookie(req.headers.cookie, CSRF_COOKIE)) {
    const sessionMaxAge =
      req.session && req.session.cookie && req.session.cookie.maxAge;
    setCsrfTokenCookie(res, sessionMaxAge || DEFAULT_MAX_AGE);
  }
  next();
};

const csrfProtect = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXCLUDED_PATHS.has(req.path)) return next();
  if (!req.session || !req.session.user) return next();

  const origin = req.headers.origin;
  if (origin) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch (e) {
      originHost = null;
    }
    if (!originHost || originHost !== req.headers.host) {
      AuditLog.record({
        actorUserId: req.session.user ? req.session.user.id : null,
        actorRole: req.session.user ? req.session.user.role : null,
        category: "SECURITY",
        action: "ORIGIN_FAILED",
        outcome: "denied",
        detail: { reason: "invalid_origin", method: req.method, path: req.path },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(403).json({ message: "Invalid request origin." });
    }
  }

  const cookieToken = readCookie(req.headers.cookie, CSRF_COOKIE);
  const headerToken = req.headers[CSRF_HEADER];
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    AuditLog.record({
      actorUserId: req.session.user ? req.session.user.id : null,
      actorRole: req.session.user ? req.session.user.role : null,
      category: "SECURITY",
      action: "CSRF_FAILED",
      outcome: "denied",
      detail: { reason: "token_mismatch", method: req.method, path: req.path },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(403).json({ message: "CSRF token validation failed." });
  }

  next();
};

module.exports = {
  ensureCsrfCookie,
  csrfProtect,
  setCsrfTokenCookie,
};
