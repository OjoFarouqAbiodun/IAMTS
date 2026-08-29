function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isOneOf(value, allowedList) {
  return allowedList.includes(value);
}

function isPositiveInteger(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value) > 0;
  }

  return false;
}

function isWithinMaxLength(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isOneOf,
  isPositiveInteger,
  isWithinMaxLength,
};
