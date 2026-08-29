require("dotenv").config();

const session = require("express-session");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const db = require("./config/db");
const PasswordReset = require("./models/PasswordReset");
const AuditLog = require("./models/AuditLog");
const authRoutes = require("./routes/authRoutes");
const assetRoutes = require("./routes/assetRoutes");
const userRoutes = require("./routes/userRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const auditRoutes = require("./routes/auditRoutes");

const { authenticate, checkRole } = require("./middleware/authMiddleware");
const {
  ensureCsrfCookie,
  csrfProtect,
} = require("./middleware/csrfMiddleware");

// Responses that carry session- or user-specific data must not be cached.
// Static files under /assets/ are served via express.static after the
// routers (so API routes such as GET /assets keep working); they are
// skipped here because express.static only sets Cache-Control when the
// header is not already present, and we want assets to use their normal
// public caching headers.
const noStore = (req, res, next) => {
  if (req.path.startsWith("/assets/")) {
    return next();
  }
  res.setHeader("Cache-Control", "no-store, private");
  next();
};

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET is not set. Configure the SESSION_SECRET environment variable (e.g. in .env) before starting the server.",
  );
}

if (process.env.NODE_ENV === "production") {
  console.warn(
    "WARNING: Using the default in-memory session store. Sessions are lost on restart; configure a production session store for multi-instance deployments.",
  );
}

const app = express();
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:
        process.env.COOKIE_SECURE === "true" ||
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(ensureCsrfCookie);
app.use(csrfProtect);

app.use(noStore);
app.use("/", authRoutes);
app.use("/", assetRoutes);
app.use("/", userRoutes);
app.use("/", maintenanceRoutes);
app.use("/", dashboardRoutes);
app.use("/", reportRoutes);
app.use("/", notificationRoutes);
app.use("/", auditRoutes);
app.use("/assets", express.static(path.join(__dirname, "../client/assets")));

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

app.get("/login.html", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/reset-password.html"));
});

app.get("/dashboard", authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});

app.get("/asset-management", authenticate, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views/asset-management.html"));
});

app.get("/user-management", authenticate, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views/user-management.html"));
});

app.get("/request-maintenance", authenticate, checkRole("Staff"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/request-maintenance.html"));
});

app.get("/maintenance-management", authenticate, checkRole("Admin", "Technician"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/maintenance-management.html"));
});

app.get("/maintenance-details", authenticate, checkRole("Admin", "Technician"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/maintenance-details.html"));
});

app.get("/pending-requests", authenticate, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/pending-requests.html"));
});

app.get("/my-requests", authenticate, checkRole("Staff"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/my-requests.html"));
});

app.get("/change-password", authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/change-password.html"));
});

app.get("/profile", authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/profile.html"));
});

app.get("/settings", authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/settings.html"));
});

app.get("/reports", authenticate, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/reports.html"));
});

app.get("/maintenance-records", authenticate, checkRole("Admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/maintenance-records.html"));
});

// Final 404 handler for unmatched routes and methods.
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Centralized error handler: never leak stack traces, filesystem paths, SQL
// statements, passwords, tokens, cookies, or session data to the client.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }

  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large." });
  }

  console.error("Unhandled error:", err && err.stack ? err.stack : err);

  const status =
    typeof err.status === "number" && err.status >= 400 ? err.status : 500;

  if (status >= 500) {
    AuditLog.record({
      actorUserId: req.session && req.session.user ? req.session.user.id : null,
      actorRole: req.session && req.session.user ? req.session.user.role : null,
      category: "SYSTEM",
      action: "UNHANDLED_ERROR",
      outcome: "error",
      detail: { method: req.method, path: req.path },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  res.status(status).json({
    message: status >= 500 ? "Internal server error" : "Invalid request",
  });
});

const server = app.listen(PORT, () => {
  console.log(`IAMTS Server is running on http://localhost:${PORT}`);

  // Fire-and-forget purge of used/expired password-reset tokens. Runs once at
  // startup and then periodically; failures are logged by the model and never
  // block request handling.
  const purgePasswordResets = () => {
    PasswordReset.purgeUsedExpired().catch(() => {});
  };
  purgePasswordResets();
  const purgeTimer = setInterval(purgePasswordResets, 6 * 60 * 60 * 1000);
  purgeTimer.unref();

  // Fire-and-forget purge of audit records older than the retention window.
  // Runs once at startup and then periodically; failures are logged by the
  // model and never block request handling.
  const purgeAuditLog = () => {
    AuditLog.purgeOlderThan(AuditLog.getRetentionDays()).catch(() => {});
  };
  purgeAuditLog();
  const auditPurgeTimer = setInterval(purgeAuditLog, 6 * 60 * 60 * 1000);
  auditPurgeTimer.unref();
});

// ---------------------------------------------------------------------------
// Graceful shutdown — idempotent, with a 10-second safety timeout.
// On SIGTERM / SIGINT: stop accepting new connections, drain in-flight
// requests (up to 10 s), close the MySQL pool, then exit.
// ---------------------------------------------------------------------------
let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received — shutting down gracefully…`);

  const forceExitTimer = setTimeout(() => {
    console.error("Forced exit after 10 s timeout");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close(() => {
    console.log("HTTP server closed");

    db.end()
      .then(() => {
        console.log("MySQL pool closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error("Error closing MySQL pool:", err.message);
        process.exit(1);
      });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
