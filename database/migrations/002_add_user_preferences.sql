-- Migration 002: Add per-user notification preferences.
--
-- Each user gets a row with one flag per notification category. A flag of 1
-- means notifications of that type should be created for the user; 0 opts out.
-- Rows are created lazily on first save (the model defaults to all enabled).

CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    notify_requests TINYINT(1) NOT NULL DEFAULT 1,
    notify_assignments TINYINT(1) NOT NULL DEFAULT 1,
    notify_completions TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
