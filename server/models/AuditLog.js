const pool = require("../config/db");

// Fixed audit event catalog. Every audit write must use one of these
// values so that category/action/outcome stay consistent throughout the
// application and can be validated by the Admin read API.
const CATEGORIES = [
  "AUTH",
  "SESSION",
  "SECURITY",
  "RBAC",
  "USER",
  "ASSET",
  "MAINTENANCE",
  "SYSTEM",
];

const ACTIONS = [
  // AUTH
  "LOGIN",
  "LOGOUT",
  "FORGOT_PASSWORD",
  "RESET_PASSWORD",
  "CHANGE_PASSWORD",
  // SESSION
  "SESSION_TERMINATED",
  // SECURITY
  "RATE_LIMITED",
  "CSRF_FAILED",
  "ORIGIN_FAILED",
  // RBAC
  "UNAUTHENTICATED",
  "FORBIDDEN",
  // USER
  "USER_CREATED",
  "USER_UPDATED",
  "USER_STATUS_CHANGED",
  "PROFILE_UPDATED",
  "PREFERENCES_UPDATED",
  // ASSET
  "ASSET_REGISTERED",
  "ASSET_UPDATED",
  "ASSET_ASSIGNED",
  "ASSET_RETURNED",
  // MAINTENANCE
  "REQUEST_CREATED",
  "REQUEST_APPROVED",
  "REQUEST_COMPLETED",
  "REQUEST_CANCELLED",
  "REQUEST_REJECTED",
  "REQUEST_OUT_OF_SERVICE",
  "TECHNICIAN_REASSIGNED",
  // SYSTEM
  "UNHANDLED_ERROR",
];

const OUTCOMES = ["success", "failure", "denied", "error"];

const TARGET_TYPES = ["users", "assets", "maintenance", "password_resets", "notifications"];

const MAX_TARGET_ID_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 255;

const isEnabled = () => process.env.AUDIT_LOG_ENABLED !== "false";

// Retention window (days). Default 180; bounded to [1, 3650] so an
// accidentally large configuration value can never grow the log unboundedly.
function getRetentionDays() {
  const raw = Number.parseInt(process.env.AUDIT_RETENTION_DAYS, 10);
  if (Number.isNaN(raw)) return 180;
  return Math.min(Math.max(raw, 1), 3650);
}

// Computes an explicit allowlisted before/after diff for an update. Only
// fields present in `allowlist` whose value actually changed are included,
// as `{ field: { from, to } }`. Never serializes whole rows.
function diff(before, after, allowlist) {
  const result = {};
  if (!before || typeof before !== "object") return result;
  if (!after || typeof after !== "object") return result;
  for (const field of allowlist) {
    const from = before[field];
    const to = after[field];
    if (from !== to) {
      result[field] = { from, to };
    }
  }
  return result;
}

// Writes a single audit row. Fire-and-forget by contract: callers invoke it
// without awaiting and the promise always resolves. A failure is logged and
// never propagated so audit problems cannot change or break application
// responses.
async function record(entry) {
  if (!isEnabled()) return;

  const actorUserId =
    Number.isInteger(entry.actorUserId) && entry.actorUserId > 0
      ? entry.actorUserId
      : null;
  const actorRole = typeof entry.actorRole === "string" ? entry.actorRole : null;
  const category = typeof entry.category === "string" ? entry.category : "";
  const action = typeof entry.action === "string" ? entry.action : "";
  const targetType = typeof entry.targetType === "string" ? entry.targetType : null;
  const targetId = typeof entry.targetId === "string" ? entry.targetId : null;
  const outcome = typeof entry.outcome === "string" ? entry.outcome : "";
  const ipAddress = typeof entry.ipAddress === "string" ? entry.ipAddress : null;
  const userAgent = typeof entry.userAgent === "string" ? entry.userAgent : null;

  // Drop malformed entries rather than storing inconsistent data.
  if (!CATEGORIES.includes(category)) return;
  if (!ACTIONS.includes(action)) return;
  if (!OUTCOMES.includes(outcome)) return;

  let detailJson = null;
  if (entry.detail !== undefined && entry.detail !== null) {
    try {
      detailJson = JSON.stringify(entry.detail);
    } catch (e) {
      detailJson = null;
    }
  }

  try {
    await pool.query(
      `
        INSERT INTO audit_log
        (
          actor_user_id,
          actor_role,
          category,
          action,
          target_type,
          target_id,
          outcome,
          detail,
          ip_address,
          user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        actorUserId,
        actorRole,
        category,
        action,
        targetType,
        targetId ? String(targetId).slice(0, MAX_TARGET_ID_LENGTH) : null,
        outcome,
        detailJson,
        ipAddress,
        userAgent ? String(userAgent).slice(0, MAX_USER_AGENT_LENGTH) : null,
      ],
    );
  } catch (err) {
    console.error("Audit log write failed:", err && err.message ? err.message : err);
  }
}

// Deletes audit records older than the configured retention window.
// Server-side only; never exposed through an API. Failure-safe.
async function purgeOlderThan(days) {
  const windowDays = Number.isInteger(days) && days > 0 ? days : getRetentionDays();
  try {
    const [result] = await pool.query(
      `DELETE FROM audit_log WHERE created_at < (NOW() - INTERVAL ? DAY)`,
      [windowDays],
    );
    if (result.affectedRows > 0) {
      console.log(
        `Purged ${result.affectedRows} audit record(s) older than ${windowDays} day(s).`,
      );
    }
    return result.affectedRows;
  } catch (err) {
    console.error("Audit log purge failed:", err && err.message ? err.message : err);
    return 0;
  }
}

// Fetch helpers used by the Admin read API. Queries are built only from
// validated, allowlisted filter values.
function buildFilters(filters, clauses, params) {
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.action) {
    clauses.push("action = ?");
    params.push(filters.action);
  }
  if (filters.outcome) {
    clauses.push("outcome = ?");
    params.push(filters.outcome);
  }
  if (filters.actorId) {
    clauses.push("actor_user_id = ?");
    params.push(filters.actorId);
  }
  if (filters.targetType) {
    clauses.push("target_type = ?");
    params.push(filters.targetType);
  }
  if (filters.targetId) {
    clauses.push("target_id = ?");
    params.push(filters.targetId);
  }
  if (filters.from) {
    clauses.push("created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("created_at <= ?");
    params.push(filters.to);
  }
}

async function search(filters, page, limit) {
  const clauses = [];
  const params = [];
  buildFilters(filters, clauses, params);

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_log ${where}`,
      params,
    );
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT
         id,
         actor_user_id,
         actor_role,
         category,
         action,
         target_type,
         target_id,
         outcome,
         detail,
         ip_address,
         user_agent,
         created_at
       FROM audit_log
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      limit,
      rows,
    };
  } catch (err) {
    console.error("Audit log search failed:", err && err.message ? err.message : err);
    throw err;
  }
}

async function stats(filters) {
  const clauses = [];
  const params = [];
  buildFilters(filters, clauses, params);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const [byCategory] = await pool.query(
      `SELECT category, COUNT(*) AS count FROM audit_log ${where} GROUP BY category ORDER BY category`,
      params,
    );
    const [byOutcome] = await pool.query(
      `SELECT outcome, COUNT(*) AS count FROM audit_log ${where} GROUP BY outcome ORDER BY outcome`,
      params,
    );

    const categoryMap = {};
    for (const row of byCategory) categoryMap[row.category] = row.count;
    const outcomeMap = {};
    for (const row of byOutcome) outcomeMap[row.outcome] = row.count;

    return { byCategory: categoryMap, byOutcome: outcomeMap };
  } catch (err) {
    console.error("Audit log stats failed:", err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = {
  CATEGORIES,
  ACTIONS,
  OUTCOMES,
  TARGET_TYPES,
  getRetentionDays,
  diff,
  record,
  purgeOlderThan,
  search,
  stats,
};
