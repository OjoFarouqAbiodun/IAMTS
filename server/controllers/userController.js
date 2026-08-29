const User = require("../models/User");
const bcrypt = require("bcrypt");
const AuditLog = require("../models/AuditLog");
const { isNonEmptyString, isValidEmail, isOneOf, isPositiveInteger, isWithinMaxLength } = require("../utils/validators");

function isDuplicateKeyError(err) {
  return err && err.code === "ER_DUP_ENTRY";
}

const getUsers = (req, res) => {
  User.getUsers((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "Failed to load users.",
      });
    }

    res.json(results);
  });
};

const getUserById = (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  User.getUserById(req.params.id, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Failed to load user.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json(results[0]);
  });
};

const createUser = async (req, res) => {
  const { full_name, email, role, password, department, phone_number } =
    req.body;

  if (!isNonEmptyString(full_name)) {
    return res.status(400).json({ message: "Full name is required." });
  }

  const trimmedFullName = full_name.trim();

  if (!isWithinMaxLength(trimmedFullName, 100)) {
    return res
      .status(400)
      .json({ message: "Full name must be at most 100 characters." });
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";

  if (!isValidEmail(trimmedEmail)) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (!isWithinMaxLength(trimmedEmail, 100)) {
    return res
      .status(400)
      .json({ message: "Email must be at most 100 characters." });
  }

  if (!isNonEmptyString(department)) {
    return res.status(400).json({ message: "Department is required." });
  }

  const trimmedDepartment = department.trim();

  if (!isWithinMaxLength(trimmedDepartment, 100)) {
    return res
      .status(400)
      .json({ message: "Department must be at most 100 characters." });
  }

  if (!isOneOf(role, ["Admin", "Technician", "Staff"])) {
    return res.status(400).json({ message: "Invalid role." });
  }

  if (!isNonEmptyString(password) || password.trim().length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const trimmedPhone =
    typeof phone_number === "string" ? phone_number.trim() : phone_number;

  if (phone_number !== undefined && !isWithinMaxLength(trimmedPhone, 20)) {
    return res
      .status(400)
      .json({ message: "Phone number must be at most 20 characters." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const userData = {
      full_name: trimmedFullName,
      email: trimmedEmail,
      department: trimmedDepartment,
      phone_number:
        phone_number !== undefined && phone_number !== "" ? trimmedPhone : "",
      role,
      password: hashedPassword,
    };

    User.createUser(userData, (err, newUserId) => {
      if (err) {
        if (isDuplicateKeyError(err)) {
          return res.status(400).json({ message: "An account with that email already exists." });
        }
        console.error(err);

        return res.status(500).json({
          message: "Failed to create user.",
        });
      }

      AuditLog.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        category: "USER",
        action: "USER_CREATED",
        outcome: "success",
        targetType: "users",
        targetId: newUserId ? String(newUserId) : null,
        detail: {
          role,
          email: trimmedEmail,
          department: trimmedDepartment,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "User created successfully!",
      });
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error.",
    });
  }
};

const updateUser = (req, res) => {
  const { full_name, email, role, department, status, phone_number } =
    req.body;

  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isNonEmptyString(full_name)) {
    return res.status(400).json({ message: "Full name is required." });
  }

  const trimmedFullName = full_name.trim();

  if (!isWithinMaxLength(trimmedFullName, 100)) {
    return res
      .status(400)
      .json({ message: "Full name must be at most 100 characters." });
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";

  if (!isValidEmail(trimmedEmail)) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (!isWithinMaxLength(trimmedEmail, 100)) {
    return res
      .status(400)
      .json({ message: "Email must be at most 100 characters." });
  }

  if (!isNonEmptyString(department)) {
    return res.status(400).json({ message: "Department is required." });
  }

  const trimmedDepartment = department.trim();

  if (!isWithinMaxLength(trimmedDepartment, 100)) {
    return res
      .status(400)
      .json({ message: "Department must be at most 100 characters." });
  }

  if (!isOneOf(role, ["Admin", "Technician", "Staff"])) {
    return res.status(400).json({ message: "Invalid role." });
  }

  if (!isOneOf(status, ["Active", "Inactive"])) {
    return res.status(400).json({ message: "Invalid status." });
  }

  const trimmedPhone =
    typeof phone_number === "string" ? phone_number.trim() : phone_number;

  if (phone_number !== undefined && !isWithinMaxLength(trimmedPhone, 20)) {
    return res
      .status(400)
      .json({ message: "Phone number must be at most 20 characters." });
  }

  User.getUserById(req.params.id, (getErr, userResults) => {
    if (getErr) {
      console.error(getErr);

      return res.status(500).json({
        message: "Failed to load user.",
      });
    }

    if (userResults.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const data = {
      full_name: trimmedFullName,
      email: trimmedEmail,
      department: trimmedDepartment,
      phone_number: phone_number === undefined ? null : trimmedPhone,
      role,
      status,
    };

    const beforeUser = userResults[0];
    const changes = AuditLog.diff(beforeUser, data, [
      "full_name",
      "email",
      "department",
      "role",
      "status",
      "phone_number",
    ]);

    User.updateUser(req.params.id, data, (err) => {
      if (err) {
        if (isDuplicateKeyError(err)) {
          return res.status(400).json({ message: "An account with that email already exists." });
        }
        console.error(err);

        return res.status(500).json({
          message: "Failed to update user.",
        });
      }

      AuditLog.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        category: "USER",
        action: "USER_UPDATED",
        outcome: "success",
        targetType: "users",
        targetId: String(req.params.id),
        detail: { changes },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "User updated successfully!",
      });
    });
  });
};

const changeStatus = (req, res) => {
  const { status } = req.body;

  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isOneOf(status, ["Active", "Inactive"])) {
    return res.status(400).json({ message: "Invalid status." });
  }

  User.getUserById(req.params.id, (getErr, userResults) => {
    if (getErr) {
      console.error(getErr);

      return res.status(500).json({
        message: "Failed to update status.",
      });
    }

    if (userResults.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    User.changeStatus(req.params.id, status, (err) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          message: "Failed to update status.",
        });
      }

      AuditLog.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        category: "USER",
        action: "USER_STATUS_CHANGED",
        outcome: "success",
        targetType: "users",
        targetId: String(req.params.id),
        detail: {
          from: userResults[0].status,
          to: status,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "Status updated successfully!",
      });
    });
  });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeStatus,
};
