-- Migration 006: Password reset tokens are stored as SHA-256 hashes.
--
-- The raw reset token is never stored in the database; only its SHA-256
-- hash is persisted (64 lowercase hex characters) so tokens can be looked
-- up deterministically without exposing the raw value. This migration
-- renames the column to make the stored representation explicit and to
-- prevent future misuse of the column as a plaintext store.
--
-- Existing rows (if any) are preserved by the rename; any previously
-- stored plaintext tokens no longer match newly generated reset links
-- and expire normally.

ALTER TABLE password_resets
    CHANGE COLUMN token token_hash VARCHAR(64) NOT NULL;
