-- Migration 001: Add 'Cancelled' maintenance status and date_cancelled column.
--
-- This change is ALREADY LIVE in production (see backups/iamts_backup_2026-08-13_0313.sql).
-- This file documents the ALTER statements that took a database from the original
-- schema (database/schema/06_maintenance.sql before this migration) to the current
-- schema, so future environments can be rebuilt correctly.
--
-- Up (forward): apply these statements.

ALTER TABLE maintenance
    MODIFY maintenance_status ENUM(
        'Pending',
        'In Progress',
        'Completed',
        'Cancelled'
    ) NOT NULL DEFAULT 'Pending';

ALTER TABLE maintenance
    ADD COLUMN date_cancelled DATETIME NULL AFTER date_completed;
