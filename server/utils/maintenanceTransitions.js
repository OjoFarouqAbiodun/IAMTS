const MAINTENANCE_TRANSITIONS = {
  Pending: ["In Progress", "Rejected", "Out of Service", "Cancelled"],
  "In Progress": ["Completed", "Rejected", "Out of Service", "In Progress"],
  Completed: [],
  Cancelled: [],
  Rejected: [],
  "Out of Service": [],
};

function canTransition(from, to) {
  const allowed = MAINTENANCE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

function getAllowedTransitions(from) {
  return MAINTENANCE_TRANSITIONS[from] || [];
}

module.exports = {
  MAINTENANCE_TRANSITIONS,
  canTransition,
  getAllowedTransitions,
};
