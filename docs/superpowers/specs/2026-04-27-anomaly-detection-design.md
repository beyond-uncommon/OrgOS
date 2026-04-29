# Anomaly Detection Pipeline — Design Spec
**Date:** 2026-04-27
**Status:** Approved (v2 — post-review revision)
**Scope:** `services/anomaly-detection/` (new service) + Prisma schema migration + `createAlert` update + `extractMetrics` integration

---

## Problem

ARCHITECTURE.md declares four anomaly types — spike detection, gap detection, inconsistency detection, and missing entry detection — but none are implemented. `detectMissingEntries()` in `intervention-engine` exists but is incomplete. The audit identified this as the highest-priority gap.

---

## Design Goals

1. Detectors are pure intelligence functions — no inline Prisma calls. The orchestrator queries data and passes it as plain objects.
2. All alert creation goes through a single Alert Factory — no detector touches the DB.
3. Severity is determined by declarative rule functions, not inline conditionals in a factory blob.
4. Every alert is traceable to the anomaly that created it via a deterministic `anomalyId`.
5. The intervention-engine becomes a pure consumer of alerts — it never generates detection signals.
6. No detector throws — all errors are caught, logged, and skipped. Detection continues.

---

## Architecture

### Layer Flow

```
Orchestrator (queries DB, passes plain objects to detectors)
  ↓
Detector (pure function — receives plain objects, returns AnomalyResult[])
  ↓
Alert Factory (maps AnomalyResult → Alert, calls createAlert with metadata)
  ↓
Intervention Engine (consumes Alerts only)
```

### Detector DB Access Pattern

Detectors do NOT import or call Prisma. The orchestrator is responsible for all data fetching. It passes pre-fetched plain objects to each detector function. This makes detectors unit-testable with no DB setup.

```
// Orchestrator fetches:
const entry: DailyEntry = await prisma.dailyEntry.findUniqueOrThrow(...)
const metrics: ExtractedMetric[] = await prisma.extractedMetric.findMany(...)
const history: ExtractedMetric[] = await prisma.extractedMetric.findMany(... 14 days ...)

// Then passes to detectors:
detectSpike({ entry, currentMetrics: metrics, history })
detectGap({ entry, currentMetrics: metrics, history })
detectInconsistency({ entry, currentMetrics: metrics })
```

### Non-Goals

- Detectors never call `createAlert` or any Prisma method.
- `alertFactory.ts` never re-evaluates thresholds or re-interprets metric values.
- `intervention-engine` never calls detectors.

---

## New Service: `services/anomaly-detection/`

### File Map

```
services/anomaly-detection/
  src/
    detectors/
      detectSpike.ts          metric deviates > threshold from 14-day rolling average
      detectGap.ts            metric absent for period it previously appeared
      detectInconsistency.ts  cross-field logical contradictions within one entry
      detectMissingEntry.ts   replaces incomplete version in intervention-engine
    thresholds.ts             typed threshold config per MetricKey
    severityRules.ts          declarative severity escalation rules per AlertType
    alertFactory.ts           maps AnomalyResult → Alert, calls createAlert
    runAnomalyDetection.ts    orchestrator: invoked after extractMetrics completes
    runEndOfDayChecks.ts      separate entry point for missing-entry detection
    index.ts
  package.json
```

---

## Types

### AnomalyResult

Pure data — no DB references, fully serializable. Returned from the orchestrator alongside created alerts for caller logging.

```ts
interface AnomalyResult {
  type: AlertType;                          // ANOMALY | INCONSISTENCY | MISSING_ENTRY | RISK
  metricKey?: MetricKey;
  entryId?: string;
  userId?: string;
  departmentId: string;
  description: string;
  detectedAt: Date;
  consecutiveDays?: number;                 // for MISSING_ENTRY escalation
}
```

### AnomalyMetadata

Stored in `Alert.metadata`. Defined in `packages/shared-types` as the canonical shape.

```ts
// packages/shared-types/src/index.ts — add:
export interface AnomalyMetadata {
  anomalyId: string;     // deterministic: sha256(type + entryId + metricKey)
  ruleVersion: string;   // "anomaly-rules-v1"
}
```

### SeverityContext

Passed to severity rule functions by the Alert Factory.

```ts
interface SeverityContext {
  type: AlertType;
  metricKey?: MetricKey;
  consecutiveDays?: number;
}
```

---

## Detectors

All detectors are pure functions. They receive pre-fetched data from the orchestrator and return `AnomalyResult[]`. They never import Prisma.

### detectSpike

**Input:** `{ entry: DailyEntry, currentMetrics: ExtractedMetric[], history: ExtractedMetric[] }`

- Skips any metric where `SPIKE_THRESHOLDS[metricKey].type !== "numeric"`.
- Skips any metric where `flagged === true` or `confidence < 0.7`.
- For each remaining metric, computes rolling average of `metricValue` across the 14-day `history`.
- If current value deviates by more than `SPIKE_THRESHOLDS[metricKey].value` percent from the rolling average, returns an `AnomalyResult` with `type: ANOMALY`.
- If history has fewer than 3 data points for a metric, skips spike detection for that metric (insufficient baseline).

### detectGap

**Input:** `{ entry: DailyEntry, currentMetrics: ExtractedMetric[], history: ExtractedMetric[] }`

- Skips any metric where `SPIKE_THRESHOLDS[metricKey].type !== "numeric"`.
- For each numeric metric, checks the `history` window (14 days).
- A gap is detected if: the metric appears ≥ 3 times in the history window AND there is no `ExtractedMetric` row for this `metricKey` in `currentMetrics` for today's entry.
- "Absent today" means: no row exists in `currentMetrics` with this `metricKey`.
- Returns an `AnomalyResult` with `type: ANOMALY` per metric gap found.

### detectInconsistency

**Input:** `{ entry: DailyEntry, currentMetrics: ExtractedMetric[] }`

Three rules. Each is evaluated independently. Each fired rule produces one `AnomalyResult` with `type: INCONSISTENCY`.

String matching is **case-insensitive substring matching** throughout.

| Rule | Condition | Null-safety |
|------|-----------|-------------|
| 1 | `entry.attendanceStatus` contains `"all present"` AND `dropout_count` metric value > 0 | If no `dropout_count` metric row exists in `currentMetrics`, rule does not fire |
| 2 | `entry.blockers` is non-empty (length > 0 after trim) AND `entry.engagementNotes` contains `"no issues"` | Both fields are always present on DailyEntry — no null risk |
| 3 | `output_count` metric value == 0 AND `entry.quickSummary` contains `"completed"` | If no `output_count` metric row exists, rule does not fire |

These three rules are exhaustive for v1. New rules are added by extending this file only — not by modifying other detectors or the factory.

### detectMissingEntry

**Input:** `{ departmentId: string, date: Date, users: User[], existingEntries: { userId: string }[], entryHistoryByUser: Record<string, DailyEntry[]> }`

The orchestrator pre-fetches all required data and passes it in.

- For each user in `users` with no entry in `existingEntries` on `date`:
  - Looks up `entryHistoryByUser[userId]` — the prior 30 calendar days of entries.
  - Counts consecutive days ending on `date` with no entry. Capped at 30.
  - Returns an `AnomalyResult` with `type: MISSING_ENTRY`, `consecutiveDays` set.

---

## Thresholds

```ts
interface ThresholdConfig {
  type: "numeric" | "categorical" | "boolean";
  value: number;  // deviation %, ignored for non-numeric
}

export const SPIKE_THRESHOLDS: Record<MetricKey, ThresholdConfig> = {
  attendance_rate:   { type: "numeric",   value: 15 },  // >15% deviation
  dropout_count:     { type: "numeric",   value: 50 },  // >50% deviation
  engagement_score:  { type: "numeric",   value: 20 },  // 1 categorical level = ~33%; 20% captures it
  output_count:      { type: "numeric",   value: 40 },  // >40% deviation
  blocker_present:   { type: "boolean",   value: 0  },  // skipped by spike/gap
  risk_flag:         { type: "boolean",   value: 0  },  // skipped by spike/gap
};
```

`engagement_score` is numeric in the threshold config because it maps to `LOW=0 / MEDIUM=1 / HIGH=2` for deviation calculation. The normalization function is defined in `packages/utils/src/index.ts`:

```ts
export function normalizeEngagementScore(value: unknown): number {
  if (value === "LOW")    return 0;
  if (value === "MEDIUM") return 1;
  if (value === "HIGH")   return 2;
  throw new Error(`Unknown engagement_score value: ${value}`);
}
```

`detectSpike` uses this when computing the rolling average for `engagement_score`. `blocker_present` and `risk_flag` are boolean — spike and gap detectors skip them via the `type` check.

---

## Severity Rules

```ts
// severityRules.ts
const SEVERITY_RULES: Record<AlertType, (ctx: SeverityContext) => Severity> = {
  MISSING_ENTRY: (ctx) =>
    (ctx.consecutiveDays ?? 0) >= 3 ? Severity.HIGH : Severity.MEDIUM,

  ANOMALY: (ctx) =>
    ctx.metricKey === "dropout_count" || ctx.metricKey === "risk_flag"
      ? Severity.CRITICAL
      : ctx.metricKey === "attendance_rate"
        ? Severity.HIGH
        : Severity.MEDIUM,

  INCONSISTENCY: (_) => Severity.MEDIUM,

  RISK: (_) => Severity.HIGH,
};

export function resolveSeverity(ctx: SeverityContext): Severity {
  return SEVERITY_RULES[ctx.type](ctx);
}
```

`risk_flag` appears in the ANOMALY severity rule because it can be detected via `detectInconsistency` (rule 3 implies risk) even though it is skipped by spike/gap detectors. The severity escalation applies regardless of which detector produced the result.

---

## Alert Factory

```ts
// alertFactory.ts

export async function createAlertFromAnomaly(
  result: AnomalyResult
): Promise<ActionResult<Alert>>
```

Responsibilities (only these — nothing else):

1. Calls `resolveSeverity({ type: result.type, metricKey: result.metricKey, consecutiveDays: result.consecutiveDays })`.
2. Generates `anomalyId` — `sha256(result.type + (result.entryId ?? "") + (result.metricKey ?? ""))`. Deterministic per phenomenon, not per timestamp.
3. **Idempotency:** Before calling `createAlert`, queries for an existing unresolved Alert with the same `anomalyId` in `metadata`. If found, returns it without creating a duplicate. This prevents double-alerts if the orchestrator is retried.
4. Calls `createAlert()` from `@orgos/intervention-engine` with `metadata: { anomalyId, ruleVersion: "anomaly-rules-v1" }`.
5. Returns the `ActionResult<Alert>`.

If `resolveSeverity` throws, the error is caught and returned as `{ success: false, error }`. Alert creation is skipped for this anomaly.

---

## createAlert Update

`services/intervention-engine/src/createAlert.ts` is updated to accept `metadata`:

```ts
interface CreateAlertInput {
  type: AlertType;
  severity: Severity;
  entryId?: string;
  weeklyReportId?: string;
  monthlyReportId?: string;
  autoAssignTo?: string;
  metadata?: AnomalyMetadata;   // ← added
}
```

`metadata` is passed directly to `prisma.alert.create`. If omitted, defaults to `undefined` (nullable column).

---

## Orchestrators

### runAnomalyDetection(entryId: string)

**Called from:** `services/metric-extraction/src/extractMetrics.ts`, after the `COMPLETE` status update.

```ts
// extractMetrics.ts — add after line that sets status to COMPLETE:
const { alerts, anomalies } = await runAnomalyDetection(entry.id);
// Log anomalies for observability — alerts are already persisted
```

**Implementation:**

1. Fetches `DailyEntry` by `entryId` — throws if not found (programming error, not a recovery case).
2. Fetches `currentMetrics` — all `ExtractedMetric` for this entry.
3. Fetches `history` — all `ExtractedMetric` for the same `departmentId` over the prior 14 calendar days (excluding today).
4. Runs `detectSpike`, `detectGap`, `detectInconsistency` via `Promise.allSettled`.
5. For each rejected detector, logs at ERROR level. Detection continues for settled detectors.
6. Collects all `AnomalyResult[]` from fulfilled detectors.
7. For each result, calls `createAlertFromAnomaly`. If that fails, logs and continues.
8. Returns `{ alerts: Alert[], anomalies: AnomalyResult[] }`.
9. Entry status remains `COMPLETE` regardless of detector outcomes.

### runEndOfDayChecks(departmentId: string, date: Date)

**Called from:** A cron-ready caller in `services/anomaly-detection/src/jobs/endOfDayJob.ts` (to be implemented as a separate task). The function is exported from the service index and is fully testable in isolation without a scheduler.

**Implementation:**

1. Fetches all users in department.
2. Fetches all DailyEntry records for the department on `date`.
3. For each user without an entry, fetches their last 30 days of DailyEntry history.
4. Passes all pre-fetched data to `detectMissingEntry`.
5. For each result, calls `createAlertFromAnomaly`.
6. Returns `{ alerts: Alert[], anomalies: AnomalyResult[] }`.

---

## Schema Migration

**File:** `prisma/migrations/YYYYMMDD_add_alert_metadata/migration.sql`
**Command:** `npx prisma migrate dev --name add_alert_metadata`

```prisma
model Alert {
  // ... all existing fields unchanged ...
  metadata  Json?   // AnomalyMetadata shape: { anomalyId: string, ruleVersion: string }
}
```

`metadata` is write-once. Never updated after creation. No DB-level index on `anomalyId` in v1 — querying by anomalyId is not a use case yet. If it becomes one, add `anomalyId String? @unique` as a top-level column at that point.

`AnomalyMetadata` type is added to `packages/shared-types/src/index.ts` as the canonical shape.

---

## intervention-engine Refactor

`services/intervention-engine/src/detectMissingEntries.ts` is replaced with a re-export:

```ts
// services/intervention-engine/src/detectMissingEntries.ts (REVISED)
// Detection logic moved to @orgos/anomaly-detection.
// Use runEndOfDayChecks for end-of-day missing entry detection.
export { detectMissingEntry } from "@orgos/anomaly-detection";
```

The intervention-engine no longer generates any detection signals. It owns: `createAlert`, `createIntervention`, `resolveIntervention`.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Detector throws | Caught by `Promise.allSettled`. Logged at ERROR. Other detectors proceed. |
| `resolveSeverity` throws | Caught in Alert Factory. Returns `{ success: false, error }`. Orchestrator logs and continues. |
| `createAlert` fails | Alert Factory returns `{ success: false }`. Orchestrator logs and continues. |
| Entry not found in `runAnomalyDetection` | Throws — this is a programming error (called with invalid entryId). |
| All detectors fail | Orchestrator returns `{ alerts: [], anomalies: [] }`. Entry status remains COMPLETE. |

Alert creation is **not transactional**. Each alert is created independently. Previously created alerts remain if a later one fails.

---

## Testing Strategy

### Detectors (unit tests, no DB)

Each detector is a pure function. Pass mock objects — no DB setup required.

- `detectSpike`: inject 14 days of history with stable values + a current metric that deviates by 20%. Assert one `AnomalyResult` returned. Inject history with 2 data points — assert no detection (insufficient baseline).
- `detectGap`: inject history with 5 appearances of a metric + no current metric for that key. Assert one result. Inject history with 2 appearances — assert no result.
- `detectInconsistency`: inject each contradictory rule combination independently. Assert each fires. Inject non-contradictory combination — assert empty result.
- `detectMissingEntry`: inject 3 users, 2 with entries. Assert 1 result with correct `userId`. Inject 3+ consecutive missing days — assert `consecutiveDays >= 3`.

### Severity rules (pure function tests)

```ts
expect(resolveSeverity({ type: "MISSING_ENTRY", consecutiveDays: 3 })).toBe(Severity.HIGH);
expect(resolveSeverity({ type: "ANOMALY", metricKey: "dropout_count" })).toBe(Severity.CRITICAL);
```

### Alert Factory (mock createAlert)

Mock `createAlert` to return `{ success: true, data: { id: "mock-id", ...defaults } }`. Assert:
- `anomalyId` matches expected hash for given input.
- `ruleVersion` equals `"anomaly-rules-v1"`.
- Severity passed to `createAlert` matches `resolveSeverity` output for the given result.

### Orchestrator (integration test against test DB)

- `runAnomalyDetection`: seed a DailyEntry + ExtractedMetrics with a known spike. Assert an Alert is created with correct type and metadata.
- `runAnomalyDetection` with one detector throwing: mock one detector to throw. Assert other detectors still run and alerts are created.
- `runEndOfDayChecks`: seed a department with 3 users, 1 missing entry. Assert 1 Alert created with `type: MISSING_ENTRY`.

---

## Dependencies

```json
{
  "@orgos/db": "workspace:*",
  "@orgos/shared-types": "workspace:*",
  "@orgos/utils": "workspace:*",
  "@orgos/intervention-engine": "workspace:*"
}
```
