# ADR 008: Policy Simulation Engine v1

**Status:** Proposed — Phase 5+ (design now, build later)
**Date:** 2026-04-27
**Depends on:** ADR-006 (Insight Engine v3 — Autonomous Action Layer), ADR-007 (Governance Layer v1)

---

## Context

The Governance Layer (ADR-007) gives the board a kill switch and a static policy table: automation
level, allowed action types, and a risk likelihood ceiling. This is necessary, but it is reactive.
Administrators setting policy cannot currently answer the question: *if I change this threshold,
what would the system have done over the past 90 days?*

Without a simulation capability, policy tuning is guesswork. A board that tightens `maxAutoRiskThreshold`
from 0.6 to 0.4 has no way to know whether that change would have blocked two actions or forty.
Similarly, when a new action type is added to `allowedAutoActions`, there is no way to preview how
often it would have fired, at what severity, and with what outcome accuracy.

The Policy Simulation Engine solves this. It replays historical `InsightForecast` + `GovernanceAuditRecord`
data through a counterfactual policy configuration and returns a projected outcome trace — without
writing any records or triggering any real actions.

This is a read-only, deterministic subsystem. It consumes frozen history. It produces projections.

---

## Decision

Design the Policy Simulation Engine as a bounded, future-phase module within the insight-engine
service. Implement nothing in the current build. Establish the interface contracts and data shapes
now so that the Governance Layer and Outcome Tracker leave the right artifacts behind.

The engine has three planned versions:

| Version | Capability | Prerequisite |
|---------|-----------|--------------|
| v1 | Deterministic replay — re-run historical forecasts through a candidate policy | ≥90 days of GovernanceAuditRecord + OutcomeRecord history |
| v2 | Monte Carlo — inject noise into likelihood/confidence estimates, run N simulations, report distribution | v1 stable; ≥6 months history |
| v3 | Policy optimizer — hill-climb or Bayesian search over the policy parameter space to find the Pareto frontier between automation rate and outcome accuracy | v2 stable; defined optimization objective |

**This ADR covers v1 architecture only.** v2 and v3 are referenced as future scope.

---

## Architecture

### Position in the System

```
Historical Data (frozen, read-only)
  InsightForecast records (v2 output, stored in DashboardSnapshot)
  GovernanceAuditRecord (what governance decided, under which policy)
  OutcomeRecord (what actually happened — prediction vs. actuals)
        ↓
Policy Simulation Engine (new module)
  Replay Engine        — re-evaluates each historical forecast under the candidate policy
  Outcome Projector    — joins replay results with OutcomeRecord to score projected accuracy
  Simulation Report    — structured summary: action rate delta, block rate delta, accuracy delta
        ↓
Simulation Result (pure data, never persisted to production tables)
```

The simulation engine never writes to `PendingAction`, `GovernanceAuditRecord`, or any production
table. It writes only to a `SimulationRun` table (build-time addition, Phase 5).

---

## Module Definitions

### `simulationRunner.ts`

Entry point. Accepts a `SimulationRequest` and returns a `SimulationResult`.

```typescript
// Future interface — do not implement yet
interface SimulationRequest {
  candidatePolicy:    CandidateBoardPolicy;
  departmentId:       string | null;  // null = org-wide
  windowStart:        Date;
  windowEnd:          Date;
  simulationRunId:    string;         // caller-provided UUID
}

interface SimulationResult {
  simulationRunId:        string;
  departmentId:           string | null;
  windowStart:            Date;
  windowEnd:              Date;
  candidatePolicy:        CandidateBoardPolicy;
  totalActionsReplayed:   number;
  actionRateDelta:        number;     // % change vs. historical baseline
  blockRateDelta:         number;     // % change in BLOCKED outcomes
  projectedAccuracyDelta: number;     // % change in prediction accuracy on allowed actions
  actionBreakdown:        SimulatedActionSummary[];
  generatedAt:            Date;
}
```

### `replayEngine.ts`

Fetches historical `GovernanceAuditRecord` rows for the window, reconstructs the `ActionPlan`
from each record, and re-runs it through `applyGovernancePolicy` with the candidate policy.

Each replayed record produces a `ReplayedDecision`:

```typescript
// Future interface — do not implement yet
interface ReplayedDecision {
  originalAuditId:      string;
  actionType:           string;
  departmentId:         string;
  originalDecision:     "ALLOWED" | "BLOCKED" | "ESCALATED";
  simulatedDecision:    "ALLOWED" | "BLOCKED" | "ESCALATED";
  decisionChanged:      boolean;
  sourceLikelihood:     number;       // stored on GovernanceAuditRecord at write time
  forecastRunId:        string;
}
```

**Dependency on Governance Layer:** `GovernanceAuditRecord` must store `sourceLikelihood` as a
field (currently absent). This is the one schema addition the Governance Layer must make before
simulation is possible. It is a non-breaking additive change.

### `outcomeProjector.ts`

Joins `ReplayedDecision[]` against `OutcomeRecord` rows by `forecastRunId`. For each action that
would have been allowed under the candidate policy, looks up whether the forecast that drove it was
accurate. Produces a `ProjectedOutcomeSummary`:

```typescript
// Future interface — do not implement yet
interface ProjectedOutcomeSummary {
  actionType:               string;
  simulatedAllowedCount:    number;
  simulatedBlockedCount:    number;
  historicalAllowedCount:   number;
  historicalBlockedCount:   number;
  outcomeAccuracyIfAllowed: number | null;  // null if no OutcomeRecords exist for this actionType
}
```

### `simulationReport.ts`

Aggregates `ProjectedOutcomeSummary[]` into a `SimulationResult`. Pure function.
No DB access. Computes deltas against the historical baseline.

### `candidatePolicyValidator.ts`

Validates a `CandidateBoardPolicy` before replay begins. Rejects configurations that would
create pathological states (e.g., `allowedAutoActions` containing items also in `forbiddenActions`,
`maxAutoRiskThreshold > 1.0`, etc.).

```typescript
// Future interface — do not implement yet
interface CandidateBoardPolicy {
  automationLevel:      "FULL" | "LIMITED" | "LOCKED";
  maxAutoRiskThreshold: number;         // 0.0–1.0
  allowedAutoActions:   string[];
  forbiddenActions:     string[];
}
```

---

## Data Contracts

### What the Governance Layer must preserve (design now)

These fields must be written to `GovernanceAuditRecord` at decision time so that the replay engine
can reconstruct a faithful simulation later. Most are already specified in ADR-007.
One addition is required:

| Field | Status | Notes |
|-------|--------|-------|
| `actionPlanId` | ✓ written today | Links replay back to a specific plan |
| `actionType` | ✓ written today | Needed for matrix lookup |
| `departmentId` | ✓ written today | Scope filter |
| `decision` | ✓ written today | Historical baseline |
| `automationLevel` | ✓ written today | Snapshot of policy at decision time |
| `boardPolicyId` | ✓ written today | Which policy ruled |
| `forecastRunId` | ✓ written today | Links to OutcomeRecord |
| `sourceLikelihood` | **missing — add now** | Required for threshold re-evaluation |

`sourceLikelihood` should be added to `GovernanceAuditRecord` (and to `GovernanceAuditEvent` in
shared-types) in the current phase, before any simulation work begins. It is a single Float field
with zero cost now and is irreplaceable once the historical window closes.

### What the Outcome Tracker must preserve (already correct)

`OutcomeRecord` stores `forecastRunId`, `metricKey`, `predictedValue`, `actualValue`, and
`forecastHorizon`. This is sufficient for the projector to score accuracy per-action.
No changes needed.

### `SimulationRun` — Phase 5 schema addition (do not add now)

```
SimulationRun
  id                  String    @id @default(cuid())
  departmentId        String?
  windowStart         DateTime
  windowEnd           DateTime
  candidatePolicy     Json      // CandidateBoardPolicy snapshot
  result              Json      // SimulationResult
  requestedByUserId   String
  createdAt           DateTime  @default(now())
```

This table is write-once. Results are never mutated. The model is append-only by design.

---

## Governance Layer Changes Required Before Phase 5

1. **Add `sourceLikelihood Float` to `GovernanceAuditRecord`** — one migration, additive, no
   breaking changes. This must be done in the current phase (Phase 4) while the Governance Layer
   is being finalized.

2. **Expose `GovernanceAuditRecord` read queries** — the replay engine will need to fetch audit
   records by `(departmentId, createdAt range)`. The query can live in `boardPolicies.ts` or a
   new `governanceAuditReader.ts`. No new abstractions needed.

No other changes to the Governance Layer are required.

---

## Non-Goals (v1)

- **No forward simulation.** v1 replays history only. It does not predict what would happen to
  future forecasts under a new policy. Forward projection is v2+ territory.

- **No real-time policy preview.** The simulation is batch-oriented. It is not a live "preview
  mode" that runs alongside production. There is no streaming output.

- **No action execution.** The simulation engine never creates `PendingAction` rows, never
  enqueues approvals, and never calls `executionRouter`. It is strictly read-only.

- **No LLM involvement.** All simulation logic is deterministic. There is no AI generation step.
  The engine replays existing signals through existing policy rules.

- **No UI in v1.** The simulation result is a JSON object. Visualizing the delta in a dashboard
  is a Phase 6 concern.

- **No multi-policy comparison.** v1 runs one candidate policy per simulation. Comparing policy A
  vs. policy B is a v2 feature (run two simulations, diff the results client-side).

---

## Assumptions

1. `GovernanceAuditRecord` rows are immutable after creation. The replay engine reads them as
   frozen history. If audit records can be mutated or deleted, simulation results become
   non-reproducible.

2. `OutcomeRecord` rows exist for a meaningful fraction of forecasts by the time simulation is
   built. If accuracy data is sparse, `outcomeProjector` will produce null accuracy deltas for
   most action types, making simulation less useful but not broken.

3. `InsightForecast` data is sufficiently stable that re-running `applyGovernancePolicy` on the
   same inputs produces the same decision. This is guaranteed as long as the policy engine remains
   deterministic (no LLM calls, no random sampling).

4. The simulation window covers at least 90 days of data. Below this threshold the sample size is
   too small for actionable deltas. The `simulationRunner` should enforce a minimum window.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `sourceLikelihood` not added to audit records before history accumulates | Medium | Add the field in Phase 4 (current phase) — it is a one-line schema change |
| Historical `GovernanceAuditRecord` volume too low at Phase 5 for meaningful simulation | Medium | Accept thin results for early runs; set minimum window enforcement |
| Policy engine logic changes between history collection and simulation run, causing replay drift | Low | Version the policy engine; `GovernanceAuditRecord` stores `automationLevel` snapshot; drift is detectable but not automatically correctable |
| Simulation is mistaken for a production signal and used to justify live policy changes without approval | Low | `SimulationRun` table must be clearly scoped as non-production; results should carry a `simulatedResult: true` flag in all log output |

---

## Phased Rollout

### v1 — Deterministic Replay (Phase 5)

Build: `simulationRunner`, `replayEngine`, `outcomeProjector`, `simulationReport`,
`candidatePolicyValidator`, `SimulationRun` schema.

Deliverable: A callable `runPolicySimulation(request)` function that returns a `SimulationResult`.
No UI. Consumed initially via direct API call or admin script.

### v2 — Monte Carlo (Phase 6+)

Extend `replayEngine` to accept a `noiseProfile` parameter. For each replayed forecast, sample
from a distribution around the original `sourceLikelihood` and `confidence` values. Run N
iterations (default 500). Report outcome distribution (P10/P50/P90) instead of a single delta.

Prerequisite: v1 stable with ≥6 months of history.

### v3 — Policy Optimizer (Phase 7+)

Define an optimization objective: maximize `automationRate × outcomeAccuracy` subject to
constraints (e.g., `blockRate < 0.15`, no forbidden action types auto-executed). Run a search
(hill climb or Bayesian) over the `CandidateBoardPolicy` parameter space using Monte Carlo v2
scoring. Return a recommended policy configuration with confidence interval.

Prerequisite: v2 stable; explicitly defined objective function agreed with stakeholders.

---

## Consequences

- **Immediate (Phase 4):** Add `sourceLikelihood Float` to `GovernanceAuditRecord` model and
  `GovernanceAuditEvent` interface. No other changes.

- **Phase 5:** Build the simulation module. The governance and action layers are untouched.
  The simulation engine is purely additive — a new directory, a new schema model, no changes to
  existing production paths.

- **Long-term:** The system gains the ability to reason about its own policy configuration using
  its own historical output. Administrators can test hypotheses before committing changes.
  Policy becomes an evidence-driven artifact, not a set of static numbers.
