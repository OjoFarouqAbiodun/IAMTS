-- Migration 007: Application audit log.
--
-- Append-only record of security events, authentication/session events,
-- authorization failures, rate-limit/CSRF/origin failures, and meaningful
-- state-changing operations. It is written only by the server (via the
-- AuditLog model); the application never updates or deletes audit rows, and
-- purge runs as a scheduled server-side job, never through an API.
--
-- The `detail` column stores an explicit allowlisted JSON diff / value set.
-- By design it NEVER contains plaintext passwords, password hashes, raw
-- password-reset tokens, token hashes, session identifiers, CSRF tokens,
-- reset URLs, request bodies, or serialized database rows.

CREATE TABLE audit_log (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    actor_user_id INT NULL,
    actor_role    ENUM('Admin', 'Technician', 'Staff') NULL,

    category      VARCHAR(32) NOT NULL,
    action        VARCHAR(64) NOT NULL,

    target_type   VARCHAR(32) NULL,
    target_id     VARCHAR(64) NULL,

    outcome       ENUM('success', 'failure', 'denied', 'error') NOT NULL DEFAULT 'success',

    detail        JSON NULL,

    ip_address    VARCHAR(45) NULL,
    user_agent    VARCHAR(255) NULL,

    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_audit_created_at (created_at),
    KEY idx_audit_category     (category),
    KEY idx_audit_actor        (actor_user_id),
    KEY idx_audit_target       (target_type, target_id),
    KEY idx_audit_action       (action),
    KEY idx_audit_outcome      (outcome),

    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
