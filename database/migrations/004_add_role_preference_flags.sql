-- Migration 004: Add role-specific notification preference flags.
--
-- Staff:
--   notify_request_updates - notified when their submitted request changes status
--   notify_completions     - notified when their request is marked completed
-- Technician:
--   notify_assignments     - notified when a maintenance job is assigned to them
--   notify_job_status      - notified when an assigned job is updated or canceled
-- Admin:
--   notify_requests        - notified when a new request is submitted
--   notify_critical        - notified when jobs complete or assets go Out of Service

ALTER TABLE user_preferences
  ADD COLUMN notify_request_updates TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN notify_job_status TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN notify_critical TINYINT(1) NOT NULL DEFAULT 1;
