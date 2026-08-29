const pool = require("../config/db");

const DEFAULTS = {
  notify_requests: 1,
  notify_assignments: 1,
  notify_completions: 1,
  notify_request_updates: 1,
  notify_job_status: 1,
  notify_critical: 1,
};

async function getPreferences(userId, callback) {
  const sql = `
    SELECT
      notify_requests,
      notify_assignments,
      notify_completions,
      notify_request_updates,
      notify_job_status,
      notify_critical
    FROM user_preferences
    WHERE user_id = ?
  `;

  try {
    const [rows] = await pool.query(sql, [userId]);

    if (rows.length === 0) {
      return callback(null, { ...DEFAULTS });
    }

    callback(null, rows[0]);
  } catch (err) {
    callback(err);
  }
}

async function savePreferences(userId, preferences, callback) {
  const sql = `
    INSERT INTO user_preferences
    (user_id, notify_requests, notify_assignments, notify_completions,
     notify_request_updates, notify_job_status, notify_critical)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      notify_requests = VALUES(notify_requests),
      notify_assignments = VALUES(notify_assignments),
      notify_completions = VALUES(notify_completions),
      notify_request_updates = VALUES(notify_request_updates),
      notify_job_status = VALUES(notify_job_status),
      notify_critical = VALUES(notify_critical)
  `;

  try {
    await pool.query(sql, [
      userId,
      preferences.notify_requests,
      preferences.notify_assignments,
      preferences.notify_completions,
      preferences.notify_request_updates,
      preferences.notify_job_status,
      preferences.notify_critical,
    ]);
    callback(null);
  } catch (err) {
    callback(err);
  }
}

module.exports = {
  getPreferences,
  savePreferences,
};
