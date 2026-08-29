const pool = require("../config/db");

async function createNotification(userId, message, callback) {
  const sql = `
    INSERT INTO notifications (user_id, message)
    VALUES (?, ?)
  `;

  try {
    await pool.query(sql, [userId, message]);
    callback(null);
  } catch (err) {
    callback(err);
  }
}

async function getNotificationsForUser(userId, callback) {
  const sql = `
    SELECT id, message, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `;

  try {
    const [rows] = await pool.query(sql, [userId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

async function getUnreadCount(userId, callback) {
  const sql = `
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  try {
    const [rows] = await pool.query(sql, [userId]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
}

async function markAllAsRead(userId, callback) {
  const sql = `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ? AND is_read = 0
  `;

  try {
    await pool.query(sql, [userId]);
    callback(null);
  } catch (err) {
    callback(err);
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAllAsRead,
};
