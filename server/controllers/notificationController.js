const Notification = require("../models/Notification");
const Preference = require("../models/Preference");

const PREFERENCE_KEYS = [
  "notify_requests",
  "notify_assignments",
  "notify_completions",
  "notify_request_updates",
  "notify_job_status",
  "notify_critical",
];

const getMyPreferences = (req, res) => {
  const userId = req.user.id;

  Preference.getPreferences(userId, (err, preferences) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(preferences);
  });
};

const saveMyPreferences = (req, res) => {
  const userId = req.user.id;
  const preferences = {};

  for (const key of PREFERENCE_KEYS) {
    const value = req.body[key];

    if (value === undefined) {
      preferences[key] = 1;
    } else if (value === 0 || value === 1) {
      preferences[key] = value;
    } else {
      return res.status(400).json({
        message: "Notification preferences must be 0 or 1.",
      });
    }
  }

  Preference.savePreferences(userId, preferences, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json({ message: "Notification preferences updated." });
  });
};

const getMyNotifications = (req, res) => {
  const userId = req.user.id;

  Notification.getNotificationsForUser(userId, (err, notifications) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    Notification.getUnreadCount(userId, (err, countResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      res.json({
        notifications,
        unreadCount: countResult[0].unreadCount,
      });
    });
  });
};

const markAsRead = (req, res) => {
  const userId = req.user.id;

  Notification.markAllAsRead(userId, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json({ message: "Notifications marked as read." });
  });
};

module.exports = {
  getMyNotifications,
  markAsRead,
  getMyPreferences,
  saveMyPreferences,
};
