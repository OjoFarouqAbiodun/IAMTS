-- Migration 003: Extend status enums to support asset maintenance state syncing.
--
-- Adds:
--   - assets.status          : 'Out of Service'
--   - maintenance.maintenance_status : 'Rejected', 'Out of Service'
--
-- New enum values are APPENDED at the end of each ENUM, so the internal
-- index position of every existing value is preserved. This is a safe,
-- non-destructive ALTER that does not drop, rename, or corrupt records.

-- Up (forward): apply these statements.

ALTER TABLE assets
    MODIFY status ENUM(
        'In Stock',
        'Assigned',
        'Under Maintenance',
        'Retired',
        'Out of Service'
    ) DEFAULT 'In Stock';

ALTER TABLE maintenance
    MODIFY maintenance_status ENUM(
        'Pending',
        'In Progress',
        'Completed',
        'Cancelled',
        'Rejected',
        'Out of Service'
    ) NOT NULL DEFAULT 'Pending';
