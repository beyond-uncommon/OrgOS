export const GovernanceEvents = Object.freeze({
  GUARD_ALLOWED:  "governance.guard_allowed",
  GUARD_BLOCKED:  "governance.guard_blocked",
  GUARD_ESCALATED:"governance.guard_escalated",
  AUDIT_WRITTEN:  "governance.audit_written",
  POLICY_FETCHED: "governance.policy_fetched",
} as const);

export type GovernanceEvent = typeof GovernanceEvents[keyof typeof GovernanceEvents];
