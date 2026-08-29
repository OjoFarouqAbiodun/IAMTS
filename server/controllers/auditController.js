const AuditLog = require("../models/AuditLog");

const { isPositiveInteger } = require("../utils/validators");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 1;

// Accepts YYYY-MM-DD (whole day) or YYYY-MM-DD HH:mm:ss. Returns a MySQL
// string bounded to the given day or exact instant, or null when invalid.
function parseDateBoundary(value, boundary) {
  if (typeof value !== "string" || value.trim() === "") return null;

  const exact = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/;

  if (exact.test(value)) {
    const d = new Date(`${value.replace(" ", "T")}`);
    if (Number.isNaN(d.getTime())) return null;
    return value;
  }

  if (dayOnly.test(value)) {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    if (boundary === "from") return `${value} 00:00:00`;
    return `${value} 23:59:59`;
  }

  return null;
}

function parsePagination(query, res) {
  let page = 1;
  let limit = DEFAULT_LIMIT;

  if (query.page !== undefined) {
    if (!/^\d+$/.test(String(query.page))) {
      res.status(400).json({ message: "Invalid pagination parameters." });
      return null;
    }
    page = Number(query.page);
    if (page < 1) {
      res.status(400).json({ message: "Invalid pagination parameters." });
      return null;
    }
  }

  if (query.limit !== undefined) {
    if (!/^\d+$/.test(String(query.limit))) {
      res.status(400).json({ message: "Invalid pagination parameters." });
      return null;
    }
    limit = Number(query.limit);
    if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
      res.status(400).json({
        message: `Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
      });
      return null;
    }
  }

  return { page, limit };
}

function parseFilters(query, res) {
  const filters = {};

  const category = query.category;
  if (category !== undefined) {
    if (!AuditLog.CATEGORIES.includes(category)) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.category = category;
  }

  const action = query.action;
  if (action !== undefined) {
    if (!AuditLog.ACTIONS.includes(action)) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.action = action;
  }

  const outcome = query.outcome;
  if (outcome !== undefined) {
    if (!AuditLog.OUTCOMES.includes(outcome)) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.outcome = outcome;
  }

  const actorId = query.actorId;
  if (actorId !== undefined) {
    if (!isPositiveInteger(actorId)) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.actorId = Number(actorId);
  }

  const targetType = query.targetType;
  if (targetType !== undefined) {
    if (!AuditLog.TARGET_TYPES.includes(targetType)) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.targetType = targetType;
  }

  const targetId = query.targetId;
  if (targetId !== undefined) {
    if (typeof targetId !== "string" || targetId.trim() === "" || targetId.length > 64) {
      res.status(400).json({ message: "Invalid filter." });
      return null;
    }
    filters.targetId = targetId;
  }

  const from = query.from;
  if (from !== undefined) {
    const parsed = parseDateBoundary(from, "from");
    if (parsed === null) {
      res.status(400).json({ message: "Invalid date filter." });
      return null;
    }
    filters.from = parsed;
  }

  const to = query.to;
  if (to !== undefined) {
    const parsed = parseDateBoundary(to, "to");
    if (parsed === null) {
      res.status(400).json({ message: "Invalid date filter." });
      return null;
    }
    filters.to = parsed;
  }

  return filters;
}

const listAuditLog = async (req, res) => {
  const pagination = parsePagination(req.query, res);
  if (!pagination) return;

  const filters = parseFilters(req.query, res);
  if (!filters) return;

  try {
    const result = await AuditLog.search(filters, pagination.page, pagination.limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const getAuditStats = async (req, res) => {
  const filters = parseFilters(req.query, res);
  if (!filters) return;

  try {
    const result = await AuditLog.stats(filters);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

module.exports = {
  listAuditLog,
  getAuditStats,
};
