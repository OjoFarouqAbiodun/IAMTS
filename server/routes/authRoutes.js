const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const AuditLog = require("../models/AuditLog");

// Audits a rate-limit rejection while preserving express-rate-limit's default
// behavior: it sets the status code (via options.statusCode) and sends the
// configured message only when the response has not already been written.
// The limiters above set standardHeaders themselves before invoking this
// handler, so no header handling is needed here. `detail` deliberately does
// not include the limiter key value (which can embed an email address).
const auditRateLimited = (limiterName) => (req, res, next, options) => {
  AuditLog.record({
    actorUserId: req.session && req.session.user ? req.session.user.id : null,
    actorRole: req.session && req.session.user ? req.session.user.role : null,
    category: "SECURITY",
    action: "RATE_LIMITED",
    outcome: "denied",
    detail: { limiter: limiterName, method: req.method, path: req.path },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  res.status(options.statusCode);
  if (!res.writableEnded) {
    res.send(options.message);
  }
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body.email || "unknown"}`,
  message: { message: "Too many login attempts. Please try again later." },
  handler: auditRateLimited("login"),
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.session && req.session.user
      ? `${ipKeyGenerator(req.ip)}:${req.session.user.id}`
      : `${ipKeyGenerator(req.ip)}:anonymous`,
  message: {
    message: "Too many password change attempts. Please try again later.",
  },
  handler: auditRateLimited("password_change"),
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "unknown";
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
  handler: auditRateLimited("forgot_password"),
});

// Global per-IP cap for the forgot-password endpoint, on top of the
// per-IP+email limiter above, so one IP cannot distribute requests across
// many distinct email addresses.
const forgotGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
  handler: auditRateLimited("forgot_password_global"),
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:reset-password`,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
  handler: auditRateLimited("reset_password"),
});

router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.post(
  "/api/auth/forgot-password",
  forgotGlobalLimiter,
  forgotPasswordLimiter,
  authController.forgotPassword,
);
router.post(
  "/api/auth/reset-password",
  resetPasswordLimiter,
  authController.resetPassword,
);
router.post(
  "/change-password",
  passwordLimiter,
  authenticate,
  authController.changePassword,
);
router.get("/me", authenticate, authController.getCurrentUser);
router.get("/me/profile", authenticate, authController.getMyProfile);
router.put("/me/profile", authenticate, authController.updateMyProfile);

module.exports = router;
