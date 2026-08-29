const pool = require("../config/db");

// Creates a password-reset token for a user.
//
// New reset requests invalidate any previous unused tokens for the same
// user (used = 1), so only one active token per user exists at a time.
// The token passed in must already be the SHA-256 hash of the raw token;
// the raw token is never stored.
const createForUser = async (userId, tokenHash, expiresAt, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0`,
      [userId],
    );

    await connection.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [userId, tokenHash, expiresAt],
    );

    await connection.commit();
    callback(null);
  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    callback(err);
  } finally {
    if (connection) connection.release();
  }
};

// Consumes a password-reset token and applies a new password.
//
// Runs inside a single transaction on one connection:
//   BEGIN
//   -> lock the matching reset row (FOR UPDATE)
//   -> verify the token exists, is unused, is unexpired, and belongs to an
//      Active user that still exists
//   -> update the user password
//   -> mark this token used
//   -> invalidate every other outstanding token for the same user
//   COMMIT
//
// The FOR UPDATE lock makes the single-use guarantee race-safe: two
// concurrent attempts with the same token serialize on the row lock and
// exactly one succeeds (the second re-reads the row as used and fails).
const resetPassword = async (tokenHash, newHashedPassword, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
        SELECT pr.id, pr.user_id
        FROM password_resets pr
        INNER JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = ?
          AND pr.used = 0
          AND pr.expires_at > NOW()
          AND u.status = 'Active'
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (rows.length === 0) {
      throw new Error("Invalid or expired reset token.");
    }

    const { id: resetId, user_id: userId } = rows[0];

    await connection.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [newHashedPassword, userId],
    );

    await connection.query(
      `UPDATE password_resets SET used = 1 WHERE id = ?`,
      [resetId],
    );

    await connection.query(
      `UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0 AND id <> ?`,
      [userId, resetId],
    );

    await connection.commit();
    callback(null, { userId });
  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    callback(err);
  } finally {
    if (connection) connection.release();
  }
};

// Deletes password-reset records that are no longer usable (already used or
// expired), leaving only active, unused, unexpired tokens in place.
//
// Failure-safe by design: any error is logged and swallowed so a cleanup
// problem can never prevent the application from starting or from processing
// password resets.
const purgeUsedExpired = async () => {
  try {
    const [result] = await pool.query(
      `DELETE FROM password_resets WHERE used = 1 OR expires_at < NOW()`,
    );
    if (result.affectedRows > 0) {
      console.log(
        `Purged ${result.affectedRows} used/expired password reset record(s).`,
      );
    }
    return result.affectedRows;
  } catch (err) {
    console.error("Password-reset cleanup failed:", err.message);
    return 0;
  }
};

module.exports = {
  createForUser,
  resetPassword,
  purgeUsedExpired,
};
