# ADR 004: Approval Workflow Design

**Status:** Accepted

## Context

System-generated reports and interventions require human oversight before they take
effect. Without an explicit approval workflow, there is no accountability gate between
AI generation and operational action.

## Decision

All system-generated entities follow a strict state machine with human approval gates:

### Report State Machine
```
DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED
```

- **DRAFT:** Initial state after generation. Only the system can enter this state.
- **UNDER_REVIEW:** Set when a reviewer opens the report for editing. Allows edits.
- **APPROVED:** Set when a reviewer with appropriate authority approves. Locks edits.
- **PUBLISHED:** Set when the report propagates to parent rollups. Terminal state.

### Intervention State Machine
```
OPEN → IN_PROGRESS → RESOLVED
```

- **OPEN:** Alert creation triggers automatic Intervention creation for HIGH/CRITICAL.
- **IN_PROGRESS:** Set when an assignee begins work.
- **RESOLVED:** Set when the issue is confirmed resolved.

### Audit Trail
- `originalContent` is preserved on every report — never mutated after generation.
- Reviewer edits are stored as immutable entries in `editLog`.
- Edits record: reviewer ID, timestamp, field changed, old value, new value.

### Authority Rules
- A reviewer cannot approve their own edits (four-eyes principle enforced at UI level).
- Any role at or above the creator's department scope can advance DRAFT → UNDER_REVIEW.
- Only roles one level above can advance UNDER_REVIEW → APPROVED.
- Only the system transitions APPROVED → PUBLISHED (during rollup).

## Consequences
- Clear audit trail for every report and intervention
- Prevents unauthorized or unvalidated AI output from affecting operations
- Reviewer bottleneck possible — requires notification system to alert reviewers
- Four-eyes principle prevents single-person override of AI-generated content
