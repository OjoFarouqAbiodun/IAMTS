const Asset = require("../models/Asset");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  isNonEmptyString,
  isOneOf,
  isPositiveInteger,
  isWithinMaxLength,
} = require("../utils/validators");

function isDuplicateKeyError(err) {
  return err && err.code === "ER_DUP_ENTRY";
}

const ASSIGN_BUSINESS_MESSAGES = new Set([
  "Asset not found.",
  "This asset cannot be assigned because its current status is",
]);

const RETURN_BUSINESS_MESSAGES = new Set([
  "No active assignment found.",
]);

function isBusinessError(err, prefixes) {
  if (!err || typeof err.message !== "string") return false;
  for (const prefix of prefixes) {
    if (err.message.startsWith(prefix)) return true;
  }
  return false;
}

function validateOptionalString(value, maxLength, fieldLabel) {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== "string") {
    return { error: `${fieldLabel} must be text.` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > maxLength) {
    return {
      error: `${fieldLabel} is too long (maximum ${maxLength} characters).`,
    };
  }
  return { value: trimmed };
}

function validatePurchaseDate(value) {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "Purchase date must be a valid date (YYYY-MM-DD)." };
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Purchase date must be a valid date (YYYY-MM-DD)." };
  }
  return { value };
}

function validateOptionalAssetFields(body) {
  const optionalStrings = [
    ["barcode", 100, "Barcode"],
    ["brand", 100, "Brand"],
    ["model", 100, "Model"],
    ["serial_number", 100, "Serial number"],
    ["location", 150, "Location"],
  ];

  const sanitized = {};

  for (const [field, maxLength, label] of optionalStrings) {
    const result = validateOptionalString(body[field], maxLength, label);
    if (result.error) return { error: result.error };
    sanitized[field] = result.value;
  }

  const dateResult = validatePurchaseDate(body.purchase_date);
  if (dateResult.error) return { error: dateResult.error };
  sanitized.purchase_date = dateResult.value;

  return { sanitized };
}

function duplicateKeyMessage(err) {
  const match = /for key '[\w]+\.(\w+)'/.exec((err && err.sqlMessage) || "");
  const field = match
    ? match[1].replace(/_/g, " ")
    : "record";
  return `A ${field} with that value already exists.`;
}

const getAssets = (req, res) => {
  Asset.getAllAssets((err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

const registerAsset = (req, res) => {
  const { asset_tag, asset_name, category_id, asset_condition } = req.body;

  if (!isNonEmptyString(asset_tag)) {
    return res.status(400).json({ message: "Asset tag is required." });
  }

  const trimmedTag = asset_tag.trim();

  if (!isWithinMaxLength(trimmedTag, 50)) {
    return res
      .status(400)
      .json({ message: "Asset tag must be at most 50 characters." });
  }

  if (!isNonEmptyString(asset_name)) {
    return res.status(400).json({ message: "Asset name is required." });
  }

  const trimmedName = asset_name.trim();

  if (!isWithinMaxLength(trimmedName, 150)) {
    return res
      .status(400)
      .json({ message: "Asset name must be at most 150 characters." });
  }

  if (!isPositiveInteger(category_id)) {
    return res
      .status(400)
      .json({ message: "A valid category must be selected." });
  }

if (!isOneOf(asset_condition, ["Excellent", "Good", "Fair", "Poor"])) {
  return res.status(400).json({ message: "Invalid asset condition." });
}

  const optionalResult = validateOptionalAssetFields(req.body);
  if (optionalResult.error) {
    return res.status(400).json({ message: optionalResult.error });
  }

  Asset.getCategoryById(category_id, (catErr, categoryResults) => {
    if (catErr) {
      console.error(catErr);

      return res.status(500).json({
        message: "Failed to register asset.",
      });
    }

    if (categoryResults.length === 0) {
      return res
        .status(400)
        .json({ message: "The selected category was not found." });
    }

    const assetData = {
      ...req.body,
      asset_tag: trimmedTag,
      asset_name: trimmedName,
      ...optionalResult.sanitized,
    };

    Asset.registerAsset(assetData, (err, newAssetId) => {
      if (err) {
        if (isDuplicateKeyError(err)) {
          return res.status(400).json({ message: duplicateKeyMessage(err) });
        }
        console.error(err);

        return res.status(500).json({
          message: "Failed to register asset.",
        });
      }

      AuditLog.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        category: "ASSET",
        action: "ASSET_REGISTERED",
        outcome: "success",
        targetType: "assets",
        targetId: newAssetId ? String(newAssetId) : null,
        detail: {
          asset_tag: trimmedTag,
          asset_name: trimmedName,
          category_id,
          asset_condition,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "Asset registered successfully!",
      });
    });
  });
};

const getCategories = (req, res) => {
  Asset.getCategories((err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

const getAssetById = (req, res) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  Asset.getAssetById(id, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    res.json(results[0]);
  });
};

const updateAsset = (req, res) => {
  const { id } = req.params;
  const { asset_tag, asset_name, category_id, asset_condition } = req.body;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  if (!isNonEmptyString(asset_tag)) {
    return res.status(400).json({ message: "Asset tag is required." });
  }

  const trimmedTag = asset_tag.trim();

  if (!isWithinMaxLength(trimmedTag, 50)) {
    return res
      .status(400)
      .json({ message: "Asset tag must be at most 50 characters." });
  }

  if (!isNonEmptyString(asset_name)) {
    return res.status(400).json({ message: "Asset name is required." });
  }

  const trimmedName = asset_name.trim();

  if (!isWithinMaxLength(trimmedName, 150)) {
    return res
      .status(400)
      .json({ message: "Asset name must be at most 150 characters." });
  }

  if (!isPositiveInteger(category_id)) {
    return res
      .status(400)
      .json({ message: "A valid category must be selected." });
  }

if (!isOneOf(asset_condition, ["Excellent", "Good", "Fair", "Poor"])) {
  return res.status(400).json({ message: "Invalid asset condition." });
}

  const optionalResult = validateOptionalAssetFields(req.body);
  if (optionalResult.error) {
    return res.status(400).json({ message: optionalResult.error });
  }

  Asset.getCategoryById(category_id, (catErr, categoryResults) => {
    if (catErr) {
      console.error(catErr);

      return res.status(500).json({
        message: "Database error",
      });
    }

    if (categoryResults.length === 0) {
      return res
        .status(400)
        .json({ message: "The selected category was not found." });
    }

    Asset.getAssetById(id, (getErr, assetResults) => {
      if (getErr) {
        console.error(getErr);

        return res.status(500).json({
          message: "Database error",
        });
      }

      if (assetResults.length === 0) {
        return res.status(404).json({
          message: "Asset not found",
        });
      }

      const assetData = {
        ...req.body,
        asset_tag: trimmedTag,
        asset_name: trimmedName,
        ...optionalResult.sanitized,
      };

      const beforeAsset = assetResults[0];
      const changes = AuditLog.diff(beforeAsset, assetData, [
        "asset_tag",
        "barcode",
        "asset_name",
        "category_id",
        "brand",
        "model",
        "serial_number",
        "purchase_date",
        "asset_condition",
        "location",
      ]);

      Asset.updateAsset(id, assetData, (err) => {
        if (err) {
          if (isDuplicateKeyError(err)) {
            return res.status(400).json({ message: duplicateKeyMessage(err) });
          }
          console.error(err);

          return res.status(500).json({
            message: "Database error",
          });
        }

        AuditLog.record({
          actorUserId: req.user.id,
          actorRole: req.user.role,
          category: "ASSET",
          action: "ASSET_UPDATED",
          outcome: "success",
          targetType: "assets",
          targetId: String(id),
          detail: { changes },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        res.json({
          message: "Asset updated successfully!",
        });
      });
    });
  });
};

const assignAsset = (req, res) => {
  const { asset_id, user_id } = req.body;

  if (!isPositiveInteger(asset_id) || !isPositiveInteger(user_id)) {
    return res
      .status(400)
      .json({ message: "A valid asset and employee must be selected." });
  }

  const assignedBy = req.user.id;

  User.getUserById(user_id, (userErr, userResults) => {
    if (userErr) {
      console.error(userErr);

      return res.status(500).json({
        message: "Failed to assign asset.",
      });
    }

    if (
      userResults.length === 0 ||
      userResults[0].role !== "Staff" ||
      userResults[0].status !== "Active"
    ) {
      return res.status(400).json({
        message: "The selected employee is not an active staff member.",
      });
    }

    Asset.assignAsset(asset_id, user_id, assignedBy, (err) => {
      if (err) {
        if (isBusinessError(err, ASSIGN_BUSINESS_MESSAGES)) {
          return res.status(400).json({ message: err.message });
        }
        console.error(err);

        return res.status(500).json({
          message: "Failed to assign asset.",
        });
      }

      AuditLog.record({
        actorUserId: assignedBy,
        actorRole: req.user.role,
        category: "ASSET",
        action: "ASSET_ASSIGNED",
        outcome: "success",
        targetType: "assets",
        targetId: String(asset_id),
        detail: { assigned_to_user_id: user_id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "Asset assigned successfully!",
      });
    });
  });
};

const returnAsset = (req, res) => {
  const { asset_id } = req.body;

  if (!isPositiveInteger(asset_id)) {
    return res.status(400).json({ message: "A valid asset must be selected." });
  }

  const returnedBy = req.user.id;

    Asset.returnAsset(asset_id, returnedBy, (err) => {
      if (err) {
        if (isBusinessError(err, RETURN_BUSINESS_MESSAGES)) {
          return res.status(400).json({ message: err.message });
        }
        console.error(err);

        return res.status(500).json({
          message: "Failed to return asset.",
        });
      }

      AuditLog.record({
        actorUserId: returnedBy,
        actorRole: req.user.role,
        category: "ASSET",
        action: "ASSET_RETURNED",
        outcome: "success",
        targetType: "assets",
        targetId: String(asset_id),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "Asset returned successfully!",
      });
    });
};

const getAssetHistory = (req, res) => {
  const assetId = req.params.id;

  if (!isPositiveInteger(assetId)) {
    return res.status(400).json({ message: "Invalid id." });
  }

  Asset.getAssetById(assetId, (getErr, assetResults) => {
    if (getErr) {
      console.error(getErr);

      return res.status(500).json({
        message: "Failed to load asset history.",
      });
    }

    if (assetResults.length === 0) {
      return res.status(404).json({
        message: "Asset not found",
      });
    }

    Asset.getAssetHistory(assetId, (err, results) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          message: "Failed to load asset history.",
        });
      }

      res.json(results);
    });
  });
};

const getAssignedAssets = (req, res) => {
  const staffId = req.user.id;

  Asset.getAssignedAssets(staffId, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Database error",
      });
    }

    res.json(results);
  });
};

module.exports = {
  getAssets,
  registerAsset,
  getCategories,
  getAssetById,
  updateAsset,
  assignAsset,
  returnAsset,
  getAssetHistory,
  getAssignedAssets,
};