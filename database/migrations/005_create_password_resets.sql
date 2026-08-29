-- Migration 005: Password reset tokens.
--
-- One row per password reset request. Tokens are single-use and expire
-- 30 minutes after they are created. The password_resets table supports the
-- POST /api/auth/forgot-password flow and the future reset-password endpoint.

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_resets_user (user_id)
);
