const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const AuditLog = require("../models/AuditLog");
const { isNonEmptyString, isValidEmail } = require("../utils/validators");
const { setCsrfTokenCookie } = require("../middleware/csrfMiddleware");
const { sendPasswordResetEmail } = require("../services/emailService");

const SESSION_MAX_AGE_DEFAULT = 1000 * 60 * 60 * 8; // 8 hours
const SESSION_MAX_AGE_REMEMBER = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Builds the password-reset link from the configured APP_BASE_URL. The
// request Host header is never used for this: it is client-controlled and
// could otherwise be abused for link injection. If APP_BASE_URL is missing
// we fail safely (return null) rather than constructing an arbitrary URL.
const buildResetUrl = (rawToken) => {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string" || baseUrl.trim() === "") {
    console.warn(
      "APP_BASE_URL is not configured; cannot build a password-reset link.",
    );
    return null;
  }
  return `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(
    rawToken,
  )}`;
};

const login = (req, res) => {
  const { email, password } = req.body;
  const remember = req.body.remember === true || req.body.remember === "true";

  const auditLoginFailure = (reason) => {
    AuditLog.record({
      category: "AUTH",
      action: "LOGIN",
      outcome: "failure",
      targetType: "users",
      detail: { reason },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  };

  if (!isValidEmail(email)) {
    auditLoginFailure("invalid_email_format");
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (!isNonEmptyString(password)) {
    auditLoginFailure("invalid_password");
    return res.status(400).json({ message: "Password is required." });
  }

  User.findByEmail(email, (err, results) => {
    if (err) {
      console.error(err);
      AuditLog.record({
        category: "AUTH",
        action: "LOGIN",
        outcome: "error",
        detail: { reason: "database_error" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(500).json({
        message: "Database error",
      });
    }

    if (results.length === 0) {
      // The email has already passed format validation, so recording it here
      // is permitted by policy; the password is never included.
      auditLoginFailure("invalid_credentials");
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        AuditLog.record({
          category: "AUTH",
          action: "LOGIN",
          outcome: "error",
          detail: { reason: "server_error" },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(500).json({
          message: "Server error",
        });
      }

      if (!isMatch || user.status !== "Active") {
        auditLoginFailure("invalid_credentials");
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      req.session.regenerate((regErr) => {
        if (regErr) {
          console.error(regErr);
          AuditLog.record({
            actorUserId: user.id,
            actorRole: user.role,
            category: "AUTH",
            action: "LOGIN",
            outcome: "error",
            targetType: "users",
            targetId: String(user.id),
            detail: { reason: "server_error" },
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
          });
          return res.status(500).json({
            message: "Server error",
          });
        }

        const userData = {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          department: user.department,
        };

        req.session.user = {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        };

        req.session.cookie.maxAge = remember
          ? SESSION_MAX_AGE_REMEMBER
          : SESSION_MAX_AGE_DEFAULT;

        setCsrfTokenCookie(res, req.session.cookie.maxAge);

        AuditLog.record({
          actorUserId: user.id,
          actorRole: user.role,
          category: "AUTH",
          action: "LOGIN",
          outcome: "success",
          targetType: "users",
          targetId: String(user.id),
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            department: user.department,
            status: user.status,
          },
        });
      });
    });
  });
};

const logout = (req, res) => {
  const sessionUserId = req.session && req.session.user ? req.session.user.id : null;
  const sessionUserRole = req.session && req.session.user ? req.session.user.role : null;

  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      AuditLog.record({
        actorUserId: sessionUserId,
        actorRole: sessionUserRole,
        category: "AUTH",
        action: "LOGOUT",
        outcome: "error",
        detail: { reason: "server_error" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(500).json({
        message: "Logout failed",
      });
    }

    AuditLog.record({
      actorUserId: sessionUserId,
      actorRole: sessionUserRole,
      category: "AUTH",
      action: "LOGOUT",
      outcome: "success",
      targetType: "users",
      targetId: sessionUserId ? String(sessionUserId) : null,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.clearCookie("connect.sid");
    res.json({
      message: "Logout successful",
    });
  });
};

const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  res.json(req.user);
};

const getMyProfile = (req, res) => {
  const userId = req.user.id;

  User.getUserById(userId, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(results[0]);
  });
};

const changePassword = (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    AuditLog.record({
      actorUserId: userId,
      actorRole: req.user.role,
      category: "AUTH",
      action: "CHANGE_PASSWORD",
      outcome: "failure",
      targetType: "users",
      targetId: String(userId),
      detail: { reason: "invalid_input" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      message: "Current and new password are required.",
    });
  }

  const trimmedNewPassword = newPassword.trim();

  if (trimmedNewPassword.length < 8) {
    AuditLog.record({
      actorUserId: userId,
      actorRole: req.user.role,
      category: "AUTH",
      action: "CHANGE_PASSWORD",
      outcome: "failure",
      targetType: "users",
      targetId: String(userId),
      detail: { reason: "weak_password" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      message: "New password must be at least 8 characters.",
    });
  }

  if (Buffer.byteLength(trimmedNewPassword, "utf8") > 72) {
    AuditLog.record({
      actorUserId: userId,
      actorRole: req.user.role,
      category: "AUTH",
      action: "CHANGE_PASSWORD",
      outcome: "failure",
      targetType: "users",
      targetId: String(userId),
      detail: { reason: "password_too_long" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      message: "New password must be at most 72 bytes.",
    });
  }

  User.getUserPasswordById(userId, (err, results) => {
    if (err) {
      console.error(err);
      AuditLog.record({
        actorUserId: userId,
        actorRole: req.user.role,
        category: "AUTH",
        action: "CHANGE_PASSWORD",
        outcome: "error",
        targetType: "users",
        targetId: String(userId),
        detail: { reason: "database_error" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      AuditLog.record({
        actorUserId: userId,
        actorRole: req.user.role,
        category: "AUTH",
        action: "CHANGE_PASSWORD",
        outcome: "failure",
        targetType: "users",
        targetId: String(userId),
        detail: { reason: "user_not_found" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(404).json({ message: "User not found" });
    }

    const storedHash = results[0].password;

    bcrypt.compare(currentPassword, storedHash, (err, isMatch) => {
      if (err) {
        console.error(err);
        AuditLog.record({
          actorUserId: userId,
          actorRole: req.user.role,
          category: "AUTH",
          action: "CHANGE_PASSWORD",
          outcome: "error",
          targetType: "users",
          targetId: String(userId),
          detail: { reason: "server_error" },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(500).json({ message: "Server error" });
      }

      if (!isMatch) {
        AuditLog.record({
          actorUserId: userId,
          actorRole: req.user.role,
          category: "AUTH",
          action: "CHANGE_PASSWORD",
          outcome: "failure",
          targetType: "users",
          targetId: String(userId),
          detail: { reason: "wrong_current_password" },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res
          .status(401)
          .json({ message: "Current password is incorrect." });
      }

      bcrypt.hash(trimmedNewPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error(err);
          AuditLog.record({
            actorUserId: userId,
            actorRole: req.user.role,
            category: "AUTH",
            action: "CHANGE_PASSWORD",
            outcome: "error",
            targetType: "users",
            targetId: String(userId),
            detail: { reason: "server_error" },
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
          });
          return res.status(500).json({ message: "Server error" });
        }

        User.updatePassword(userId, hashedPassword, (err) => {
          if (err) {
            console.error(err);
            AuditLog.record({
              actorUserId: userId,
              actorRole: req.user.role,
              category: "AUTH",
              action: "CHANGE_PASSWORD",
              outcome: "error",
              targetType: "users",
              targetId: String(userId),
              detail: { reason: "database_error" },
              ipAddress: req.ip,
              userAgent: req.get("user-agent"),
            });
            return res.status(500).json({ message: "Database error" });
          }

          AuditLog.record({
            actorUserId: userId,
            actorRole: req.user.role,
            category: "AUTH",
            action: "CHANGE_PASSWORD",
            outcome: "success",
            targetType: "users",
            targetId: String(userId),
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
          });

          invalidateOtherSessions(req, userId);

          res.json({ message: "Password changed successfully." });
        });
      });
    });
  });
};

const updateMyProfile = (req, res) => {
  const userId = req.user.id;
  const { full_name, phone_number } = req.body;

  if (!isNonEmptyString(full_name)) {
    return res.status(400).json({ message: "Full name is required." });
  }

  if (phone_number !== undefined && typeof phone_number !== "string") {
    return res.status(400).json({ message: "Invalid phone number." });
  }

  const data = {
    full_name: full_name.trim(),
    phone_number: isNonEmptyString(phone_number) ? phone_number.trim() : null,
  };

  User.getUserById(userId, (getErr, profileResults) => {
    if (getErr) {
      console.error(getErr);
      return res.status(500).json({ message: "Database error" });
    }

    const beforeProfile = profileResults && profileResults[0] ? profileResults[0] : null;
    const changes = AuditLog.diff(beforeProfile, data, [
      "full_name",
      "phone_number",
    ]);

    User.updateOwnProfile(userId, data, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      AuditLog.record({
        actorUserId: userId,
        actorRole: req.user.role,
        category: "USER",
        action: "PROFILE_UPDATED",
        outcome: "success",
        targetType: "users",
        targetId: String(userId),
        detail: { changes },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      req.user.full_name = data.full_name;
      if (req.session.user) {
        req.session.user.full_name = data.full_name;
      }

      res.json({ message: "Profile updated successfully." });
    });
  });
};

const forgotPassword = (req, res) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    AuditLog.record({
      category: "AUTH",
      action: "FORGOT_PASSWORD",
      outcome: "failure",
      detail: { reason: "invalid_email_format" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      success: false,
      message: "A valid email is required.",
    });
  }

  User.findByEmail(email, (err, results) => {
    if (err) {
      console.error(err);
      AuditLog.record({
        category: "AUTH",
        action: "FORGOT_PASSWORD",
        outcome: "error",
        detail: { reason: "database_error" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    const genericResponse = {
      success: true,
      message: "Password reset link sent to your email address.",
    };

    if (results.length === 0) {
      // Record without the email address so the audit trail never becomes a
      // source of account enumeration or unnecessary PII.
      AuditLog.record({
        category: "AUTH",
        action: "FORGOT_PASSWORD",
        outcome: "success",
        detail: { reason: "email_not_found" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json(genericResponse);
    }

    const user = results[0];

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    PasswordReset.createForUser(user.id, tokenHash, expiresAt, (createErr) => {
      if (createErr) {
        console.error(createErr);
        AuditLog.record({
          actorUserId: user.id,
          actorRole: user.role,
          category: "AUTH",
          action: "FORGOT_PASSWORD",
          outcome: "error",
          targetType: "users",
          targetId: String(user.id),
          detail: { reason: "database_error" },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      AuditLog.record({
        actorUserId: user.id,
        actorRole: user.role,
        category: "AUTH",
        action: "FORGOT_PASSWORD",
        outcome: "success",
        targetType: "users",
        targetId: String(user.id),
        detail: { reason: "reset_email_sent" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      const resetUrl = buildResetUrl(rawToken);
      if (resetUrl) {
        sendPasswordResetEmail(user.email, resetUrl).catch(() => {});
      }

      return res.json(genericResponse);
    });
  });
};

// Best-effort invalidation of OTHER sessions for the same user after a
// password change. Unlike invalidateUserSessions, the current session is
// preserved so the user stays logged in. Other sessions belonging to the
// same user are destroyed to invalidate potentially stolen sessions.
const invalidateOtherSessions = (req, userId) => {
  const store = req.sessionStore;
  if (!store || typeof store.all !== "function") {
    return;
  }

  const currentSid = req.sessionID;

  try {
    store.all((err, sessions) => {
      if (err || !sessions) return;
      for (const sid of Object.keys(sessions)) {
        if (sid === currentSid) continue;
        const session = sessions[sid];
        if (session && session.user && session.user.id === userId) {
          store.destroy(sid, () => {});
        }
      }
    });
  } catch (e) {
    // Best-effort; never fail the password change because of it.
  }
};

// Best-effort session invalidation after a successful password reset.
//
// The current request's session is destroyed and its cookie cleared. Any
// other sessions belonging to the reset user that exist in the in-memory
// session store are also destroyed. The default MemoryStore does not index
// sessions by user id, so this is a linear scan; that is acceptable for a
// single-instance deployment. If the store does not support enumeration,
// this is skipped (a documented limitation) rather than worked around
// unsafely.
const invalidateUserSessions = (req, res, userId) => {
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.clearCookie("connect.sid");

  const store = req.sessionStore;
  if (!store || typeof store.all !== "function") {
    return;
  }

  try {
    store.all((err, sessions) => {
      if (err || !sessions) return;
      for (const sid of Object.keys(sessions)) {
        const session = sessions[sid];
        if (session && session.user && session.user.id === userId) {
          store.destroy(sid, () => {});
        }
      }
    });
  } catch (e) {
    // Session invalidation is best-effort; never fail the reset because of it.
  }
};

const resetPassword = (req, res) => {
  const { token, newPassword } = req.body;

  if (!isNonEmptyString(token)) {
    AuditLog.record({
      category: "AUTH",
      action: "RESET_PASSWORD",
      outcome: "failure",
      detail: { reason: "invalid_token" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token.",
    });
  }

  if (!isNonEmptyString(newPassword)) {
    AuditLog.record({
      category: "AUTH",
      action: "RESET_PASSWORD",
      outcome: "failure",
      detail: { reason: "invalid_password" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters.",
    });
  }

  const trimmedNewPassword = newPassword.trim();

  if (trimmedNewPassword.length < 8) {
    AuditLog.record({
      category: "AUTH",
      action: "RESET_PASSWORD",
      outcome: "failure",
      detail: { reason: "weak_password" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters.",
    });
  }

  if (Buffer.byteLength(trimmedNewPassword, "utf8") > 72) {
    AuditLog.record({
      category: "AUTH",
      action: "RESET_PASSWORD",
      outcome: "failure",
      detail: { reason: "password_too_long" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(400).json({
      success: false,
      message: "New password must be at most 72 bytes.",
    });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  bcrypt.hash(trimmedNewPassword, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.error(hashErr);
      AuditLog.record({
        category: "AUTH",
        action: "RESET_PASSWORD",
        outcome: "error",
        detail: { reason: "server_error" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    PasswordReset.resetPassword(tokenHash, hashedPassword, (resetErr, result) => {
      if (resetErr) {
        if (resetErr.message === "Invalid or expired reset token.") {
          AuditLog.record({
            category: "AUTH",
            action: "RESET_PASSWORD",
            outcome: "failure",
            detail: { reason: "invalid_token" },
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
          });
          return res.status(400).json({
            success: false,
            message: "Invalid or expired reset token.",
          });
        }

        console.error(resetErr);
        AuditLog.record({
          category: "AUTH",
          action: "RESET_PASSWORD",
          outcome: "error",
          detail: { reason: "database_error" },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      AuditLog.record({
        category: "AUTH",
        action: "RESET_PASSWORD",
        outcome: "success",
        targetType: "users",
        targetId: result && result.userId ? String(result.userId) : null,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      invalidateUserSessions(req, res, result ? result.userId : null);

      return res.json({
        success: true,
        message: "Password reset successful. You can now log in.",
      });
    });
  });
};

module.exports = {
  buildResetUrl,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
};