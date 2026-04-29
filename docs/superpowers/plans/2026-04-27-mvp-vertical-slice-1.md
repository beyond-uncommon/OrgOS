# MVP Vertical Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the full OrgOS loop end-to-end: one instructor submits a daily entry and a department head sees AI-generated intelligence, anomalies, and a governance-gated approval queue on one screen.

**Architecture:** The web layer is a thin Next.js App Router shell over existing service modules. No new backend services are created — we wire what exists (`ingestion-engine`, `metric-extraction`, `dashboard-engine`) into server actions and pages. The seed script produces demo-grade history so the intelligence layer has enough signal to show real output on first load.

**Tech Stack:** Next.js 14 App Router, MUI v6, TypeScript strict, Prisma, existing `@orgos/*` service packages, Zod (form validation), React Hook Form (optional — plain controlled state is acceptable for this scope).

---

## Codebase Context (read before starting)

**What already exists — do not rebuild:**
- `packages/ui/src/components/MetricCard/` — MetricCard component, fully built
- `apps/web/src/modules/daily-inputs/schema.ts` — Zod form schema (`dailyEntryFormSchema`)
- `apps/web/src/modules/daily-inputs/actions/submitDailyEntry.ts` — server action (calls ingestion only)
- `apps/web/src/modules/daily-inputs/queries.ts` — `getDailyEntriesForUser`, `getDailyEntriesForDepartment`
- `apps/web/src/modules/dashboards/queries.ts` — `getDepartmentDashboard`, `getRecentAlerts`
- `apps/web/src/modules/interventions/queries.ts` — `getOpenInterventions`
- `apps/web/src/app/providers.tsx` — MUI ThemeProvider already wired
- `services/metric-extraction/src/extractMetrics.ts` — triggers anomaly detection fire-and-forget
- `services/dashboard-engine/src/refreshDepartmentSnapshot.ts` — aggregates metrics to snapshot
- `services/insight-engine/src/orchestrators/generateWeeklyInsights.ts` — writes WEEKLY DashboardSnapshot with full InsightReport
- `packages/db/prisma/seed.ts` — minimal seed (1 dept, 1 instructor, 1 admin) — needs upgrade

**Key gaps this plan closes:**
1. Seed has no history → intelligence layer shows nothing
2. `submitDailyEntry` calls ingestion only — never triggers `extractMetrics` or snapshot refresh
3. No pages exist beyond the homepage placeholder
4. No approval queue query in the web module
5. `@orgos/insight-engine` is not a dependency of `apps/web` yet

**Data shape contract:**
- `DashboardSnapshot` with `periodType: DAILY` stores `Record<metricKey, values[]>` — raw aggregation
- `DashboardSnapshot` with `periodType: WEEKLY` stores a full `InsightReport` object as JSON — insight narrative + risks + recommendations
- The dashboard page reads BOTH: one query per period type

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/db/prisma/seed.ts` | **Modify** | Demo-grade seed: 1 dept, 3 instructors, 1 dept head, 14 days history, pre-built snapshots, 1 alert, 1 pending action |
| `apps/web/package.json` | **Modify** | Add `@orgos/insight-engine` dependency |
| `apps/web/src/modules/daily-inputs/actions/submitDailyEntry.ts` | **Modify** | Wire extractMetrics + refreshDepartmentSnapshot after ingestion |
| `apps/web/src/modules/approvals/queries.ts` | **Create** | `getPendingActionsForDepartment()` — fetches PENDING actions not yet expired |
| `apps/web/src/modules/approvals/actions/resolveAction.ts` | **Create** | `approveAction` / `rejectAction` server actions |
| `apps/web/src/modules/dashboards/queries.ts` | **Modify** | Add `getWeeklyInsightSnapshot(departmentId)` — fetches most recent WEEKLY snapshot |
| `apps/web/src/modules/dashboards/department/MetricsStrip.tsx` | **Create** | Four MetricCards from daily snapshot data |
| `apps/web/src/modules/dashboards/department/RisksPanel.tsx` | **Create** | Alert list: severity chip, description, timestamp — highest priority first |
| `apps/web/src/modules/dashboards/department/InsightNarrativePanel.tsx` | **Create** | Weekly insight summary + recommendations from InsightReport snapshot |
| `apps/web/src/modules/dashboards/department/ApprovalQueuePanel.tsx` | **Create** | PendingAction list with approve/reject buttons |
| `apps/web/src/modules/daily-inputs/components/DailyEntryForm.tsx` | **Create** | Controlled form using dailyEntryFormSchema, calls submitDailyEntry |
| `apps/web/src/app/departments/[departmentId]/page.tsx` | **Create** | Department Intelligence Dashboard — server component, 4 panels |
| `apps/web/src/app/submit/page.tsx` | **Create** | Daily Entry submission page — client component with DailyEntryForm |
| `apps/web/src/app/page.tsx` | **Modify** | Replace placeholder with navigation links to dashboard + submit form |

---

## Task 1: Upgrade Seed to Demo-Grade

**Files:**
- Modify: `packages/db/prisma/seed.ts`

The current seed has 1 dept, 1 instructor, 1 admin — no history. The intelligence layer needs 14 days of entries with a deliberate trend (declining attendance over days 10–14) to produce a real anomaly and meaningful insight. The seed creates everything directly — no pipeline calls — so no Anthropic API key is required to run it.

- [ ] **Step 1: Replace seed.ts with demo-grade version**

Replace the full contents of `packages/db/prisma/seed.ts` with:

```typescript
import {
  PrismaClient,
  Role,
  EntryStatus,
  MetricSource,
  AlertType,
  Severity,
  SnapshotScope,
  PeriodType,
  PendingActionStatus,
  ActionExecutionMode,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Departments ──────────────────────────────────────────────────────────
  const org = await prisma.department.upsert({
    where: { id: "org-root" },
    update: {},
    create: { id: "org-root", name: "Uncommon Schools" },
  });

  const dept = await prisma.department.upsert({
    where: { id: "dept-math" },
    update: {},
    create: { id: "dept-math", name: "Mathematics Department", parentDepartmentId: org.id },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const deptHead = await prisma.user.upsert({
    where: { email: "depthead@uncommon.org" },
    update: {},
    create: { email: "depthead@uncommon.org", name: "Jordan Kim", role: Role.DEPARTMENT_HEAD, departmentId: dept.id },
  });

  await prisma.user.upsert({
    where: { email: "admin@uncommon.org" },
    update: {},
    create: { email: "admin@uncommon.org", name: "Admin User", role: Role.ADMIN, departmentId: org.id },
  });

  const instructors = await Promise.all([
    prisma.user.upsert({
      where: { email: "alex@uncommon.org" },
      update: {},
      create: { email: "alex@uncommon.org", name: "Alex Rivera", role: Role.INSTRUCTOR, departmentId: dept.id },
    }),
    prisma.user.upsert({
      where: { email: "morgan@uncommon.org" },
      update: {},
      create: { email: "morgan@uncommon.org", name: "Morgan Chen", role: Role.INSTRUCTOR, departmentId: dept.id },
    }),
    prisma.user.upsert({
      where: { email: "taylor@uncommon.org" },
      update: {},
      create: { email: "taylor@uncommon.org", name: "Taylor Brooks", role: Role.INSTRUCTOR, departmentId: dept.id },
    }),
  ]);

  // ── Demo instructor for the submit form ──────────────────────────────────
  const demoInstructor = instructors[0]!;

  // ── 14 days of history ────────────────────────────────────────────────────
  // Attendance deliberately declines over the last 4 days to trigger anomaly
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type DayProfile = {
    attendanceStatus: string;
    outputCompleted: string;
    blockers: string;
    engagementNotes: string;
    quickSummary: string;
    attendanceRate: number;
    engagementScore: string;
    outputCount: number;
    dropoutCount: number;
  };

  function dayProfile(daysAgo: number, instructorIdx: number): DayProfile {
    // Last 4 days (daysAgo 1–4): attendance decline to produce a visible anomaly
    const declining = daysAgo >= 1 && daysAgo <= 4;
    const attendanceRate = declining ? 0.55 + (Math.random() * 0.1) : 0.88 + (Math.random() * 0.07);
    const engagementScore = declining ? "LOW" : (Math.random() > 0.3 ? "HIGH" : "MEDIUM");
    const outputCount = declining ? 4 + instructorIdx : 10 + instructorIdx;
    const dropoutCount = declining ? 2 : 0;

    return {
      attendanceStatus: `${Math.round(attendanceRate * 28)} of 28 students present`,
      outputCompleted: `${outputCount} assignments reviewed and graded`,
      blockers: declining ? "Low student attendance affecting lesson pacing" : "",
      engagementNotes: declining
        ? "Students appear disengaged, several checked out after lunch"
        : "Strong participation across all groups today",
      quickSummary: declining
        ? `Attendance low (${Math.round(attendanceRate * 100)}%). Engagement suffering. Need intervention.`
        : `Good session. ${outputCount} outputs completed. High engagement.`,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      engagementScore,
      outputCount,
      dropoutCount,
    };
  }

  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - daysAgo);

    for (let i = 0; i < instructors.length; i++) {
      const instructor = instructors[i]!;
      const profile = dayProfile(daysAgo, i);

      const existing = await prisma.dailyEntry.findUnique({
        where: { userId_date: { userId: instructor.id, date: entryDate } },
      });
      if (existing) continue;

      const entry = await prisma.dailyEntry.create({
        data: {
          userId: instructor.id,
          departmentId: dept.id,
          date: entryDate,
          status: EntryStatus.COMPLETE,
          attendanceStatus: profile.attendanceStatus,
          outputCompleted: profile.outputCompleted,
          blockers: profile.blockers,
          engagementNotes: profile.engagementNotes,
          quickSummary: profile.quickSummary,
        },
      });

      await prisma.extractedMetric.createMany({
        data: [
          { entryId: entry.id, metricKey: "attendance_rate", metricValue: profile.attendanceRate, confidence: 1.0, source: MetricSource.STRUCTURED, flagged: false, promptVersion: "extraction-v1" },
          { entryId: entry.id, metricKey: "engagement_score", metricValue: profile.engagementScore, confidence: 1.0, source: MetricSource.STRUCTURED, flagged: false, promptVersion: "extraction-v1" },
          { entryId: entry.id, metricKey: "output_count", metricValue: profile.outputCount, confidence: 1.0, source: MetricSource.STRUCTURED, flagged: false, promptVersion: "extraction-v1" },
          { entryId: entry.id, metricKey: "dropout_count", metricValue: profile.dropoutCount, confidence: 0.9, source: MetricSource.NARRATIVE, flagged: false, promptVersion: "extraction-v1" },
        ],
        skipDuplicates: true,
      });
    }
  }

  // ── Alert: attendance spike anomaly ──────────────────────────────────────
  const recentEntry = await prisma.dailyEntry.findFirst({
    where: { departmentId: dept.id },
    orderBy: { date: "desc" },
  });

  const existingAlert = await prisma.alert.findFirst({ where: { type: AlertType.ANOMALY } });
  if (!existingAlert && recentEntry) {
    await prisma.alert.create({
      data: {
        type: AlertType.ANOMALY,
        severity: Severity.HIGH,
        resolved: false,
        entryId: recentEntry.id,
        metadata: {
          anomalyId: "seed-anomaly-001",
          ruleVersion: "anomaly-rules-v1",
          anomalyType: "SPIKE",
          metricKey: "attendance_rate",
          entryId: recentEntry.id,
          description: "Attendance rate dropped 37% below 14-day rolling average. Consecutive decline for 4 days.",
          detectedAt: new Date().toISOString(),
          detectionWindow: "14d",
        },
      },
    });
  }

  // ── Daily DashboardSnapshot (raw metric aggregation) ─────────────────────
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const existingDailySnapshot = await prisma.dashboardSnapshot.findFirst({
    where: { departmentId: dept.id, periodType: PeriodType.DAILY },
  });
  if (!existingDailySnapshot) {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: dept.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.DAILY,
        periodStart: yesterday,
        data: {
          attendance_rate: [0.57, 0.61, 0.59],
          engagement_score: ["LOW", "LOW", "MEDIUM"],
          output_count: [5, 6, 7],
          dropout_count: [2, 2, 1],
        },
      },
    });
  }

  // ── Weekly DashboardSnapshot (InsightReport shape) ────────────────────────
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const existingWeeklySnapshot = await prisma.dashboardSnapshot.findFirst({
    where: { departmentId: dept.id, periodType: PeriodType.WEEKLY },
  });
  if (!existingWeeklySnapshot) {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: dept.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.WEEKLY,
        periodStart: weekStart,
        data: {
          type: "WEEKLY",
          departmentId: dept.id,
          summary: "Attendance has declined sharply over the past four days, falling 37% below the 14-day rolling average. Engagement scores have tracked the decline, with two of three instructors reporting low engagement in afternoon sessions. Output counts remain above threshold but are trending downward. Immediate attention is recommended.",
          insights: [
            {
              type: "TREND",
              severity: "HIGH",
              description: "Attendance rate declining across all instructors for 4 consecutive days.",
              evidence: [],
            },
            {
              type: "RISK_CLUSTER",
              severity: "MEDIUM",
              description: "Low engagement co-occurring with attendance drop — typical precursor to dropout spike.",
              evidence: [],
            },
          ],
          correlations: [
            {
              cause: "Attendance decline",
              effect: "Engagement deterioration",
              confidence: 0.82,
              supportingAnomalies: [],
            },
          ],
          risks: [
            {
              category: "OPERATIONAL",
              severity: "HIGH",
              description: "Attendance below intervention threshold for 4 consecutive school days across the department.",
              evidence: [],
            },
            {
              category: "ENGAGEMENT",
              severity: "MEDIUM",
              description: "Afternoon session engagement consistently rated LOW by two of three instructors.",
              evidence: [],
            },
          ],
          recommendations: [
            "Initiate attendance recovery protocol — contact families of chronically absent students.",
            "Schedule department check-in to identify root cause of engagement drop.",
            "Consider afternoon schedule adjustment or engagement intervention workshop.",
          ],
          confidence: 0.79,
          generatedAt: new Date().toISOString(),
          promptVersion: "weekly-summary-v1",
        },
      },
    });
  }

  // ── PendingAction (governance-gated approval queue) ───────────────────────
  const existingAction = await prisma.pendingAction.findFirst({
    where: { departmentId: dept.id, status: PendingActionStatus.PENDING },
  });
  if (!existingAction) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.pendingAction.create({
      data: {
        departmentId: dept.id,
        actionType: "student_engagement_intervention",
        target: dept.id,
        priority: 1,
        urgency: "24H",
        executionMode: ActionExecutionMode.HUMAN_APPROVAL,
        rationale: "Attendance has declined 37% over 4 days. Engagement risk is HIGH. Recommended: initiate attendance recovery protocol and schedule family outreach.",
        payload: { alertType: "SPIKE", metricKey: "attendance_rate", daysDeclined: 4, avgRate: 0.58 },
        forecastRunId: "seed-forecast-001",
        expiresAt,
        status: PendingActionStatus.PENDING,
      },
    });
  }

  // ── BoardPolicy (DEFAULT: LIMITED automation) ─────────────────────────────
  const existingPolicy = await prisma.boardPolicy.findFirst({ where: { active: true } });
  if (!existingPolicy) {
    await prisma.boardPolicy.create({
      data: {
        departmentId: null,
        automationLevel: "LIMITED",
        maxAutoRiskThreshold: 0.6,
        allowedAutoActions: ["baseline_documentation", "engagement_opportunity_flag"],
        forbiddenActions: [],
        active: true,
        setByUserId: deptHead.id,
      },
    });
  }

  console.log("✓ Demo seed complete.");
  console.log(`  Department: ${dept.name} (${dept.id})`);
  console.log(`  Dashboard URL: /departments/${dept.id}`);
  console.log(`  Submit URL: /submit?userId=${demoInstructor.id}&departmentId=${dept.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
cd packages/db && pnpm seed
```

Expected output:
```
✓ Demo seed complete.
  Department: Mathematics Department (dept-math)
  Dashboard URL: /departments/dept-math
  Submit URL: /submit?userId=<id>&departmentId=dept-math
```

- [ ] **Step 3: Verify seed data in Prisma Studio**

```bash
cd packages/db && pnpm studio
```

Check: DailyEntry table has ~42 rows. DashboardSnapshot has 2 rows (DAILY + WEEKLY). Alert has 1 row. PendingAction has 1 row.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(seed): upgrade to demo-grade — 14 days history, anomaly, insight snapshot, pending action"
```

---

## Task 2: Wire Pipeline — submitDailyEntry → extractMetrics + Snapshot Refresh

**Files:**
- Modify: `apps/web/src/modules/daily-inputs/actions/submitDailyEntry.ts`
- Modify: `apps/web/package.json`

After ingestion succeeds, the action must fire `extractMetrics` (which itself fires anomaly detection) and then trigger a snapshot refresh. Both are fire-and-forget — they must never block the UI response or surface internal errors to the user.

**Note on fire-and-forget safety:** In a long-lived Node.js process (local dev, Docker, always-on server), `void promise.catch()` is safe. If this is ever deployed on a serverless platform (Vercel, AWS Lambda), the response may be torn down before the background chain completes. For the MVP slice, the assumption is a persistent Node.js process. Document this in the action file. If/when moving to serverless, replace with `waitUntil` from `@vercel/functions`.

- [ ] **Step 1: Add `@orgos/insight-engine` to web app dependencies**

In `apps/web/package.json`, add to `dependencies`:
```json
"@orgos/insight-engine": "workspace:*"
```

Run `pnpm install` from repo root.

- [ ] **Step 2: Update submitDailyEntry server action**

Replace the full contents of `apps/web/src/modules/daily-inputs/actions/submitDailyEntry.ts`:

```typescript
"use server";

import { ingestDailyEntry } from "@orgos/ingestion-engine";
import { extractMetrics } from "@orgos/metric-extraction";
import { refreshDepartmentSnapshot } from "@orgos/dashboard-engine";
import { logError } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";

export async function submitDailyEntry(
  userId: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<DailyEntry>> {
  const result = await ingestDailyEntry({ userId, departmentId, ...formData as object });

  if (!result.success) return result;

  // Fire-and-forget pipeline. Safe in a persistent Node.js process.
  // If deployed serverless, replace with waitUntil(@vercel/functions) to prevent teardown.
  const entry = result.data;
  void extractMetrics(entry)
    .then(() => refreshDepartmentSnapshot(departmentId, entry.date))
    .catch((err) => logError("submit_daily_entry.pipeline_error", err, { entryId: entry.id }));

  return result;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/modules/daily-inputs/actions/submitDailyEntry.ts
git commit -m "feat(pipeline): wire extractMetrics + snapshot refresh after daily entry submission"
```

---

## Task 3: Approval Queue Web Module

**Files:**
- Create: `apps/web/src/modules/approvals/queries.ts`
- Create: `apps/web/src/modules/approvals/actions/resolveAction.ts`

The dashboard needs to read pending actions and let the dept head approve or reject them.

- [ ] **Step 1: Create `apps/web/src/modules/approvals/queries.ts`**

```typescript
import { prisma, PendingActionStatus } from "@orgos/db";

export interface PendingActionRow {
  id: string;
  actionType: string;
  rationale: string;
  priority: number;
  urgency: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function getPendingActionsForDepartment(
  departmentId: string,
): Promise<PendingActionRow[]> {
  return prisma.pendingAction.findMany({
    where: {
      departmentId,
      status: PendingActionStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      actionType: true,
      rationale: true,
      priority: true,
      urgency: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}
```

- [ ] **Step 2: Create `apps/web/src/modules/approvals/actions/resolveAction.ts`**

```typescript
"use server";

import { approveAction, rejectAction } from "@orgos/insight-engine";
import type { ActionResult } from "@orgos/utils";

export async function approvePendingAction(
  pendingActionId: string,
  approverId: string,
): Promise<ActionResult<void>> {
  try {
    await approveAction(pendingActionId, approverId);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function rejectPendingAction(
  pendingActionId: string,
  rejectorId: string,
): Promise<ActionResult<void>> {
  try {
    await rejectAction(pendingActionId, rejectorId);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

- [ ] **Step 3: Add weekly insight query to dashboards module**

In `apps/web/src/modules/dashboards/queries.ts`, update the existing `@orgos/db` import to include `PeriodType` (it's not currently imported), then append the new function.

The updated import line (replace the existing one):
```typescript
import { prisma, SnapshotScope, PeriodType } from "@orgos/db";
```

Then append this function at the end of the file:
```typescript
export async function getWeeklyInsightSnapshot(departmentId: string) {
  return prisma.dashboardSnapshot.findFirst({
    where: {
      departmentId,
      scope: SnapshotScope.DEPARTMENT,
      periodType: PeriodType.WEEKLY,
    },
    orderBy: { periodStart: "desc" },
  });
}
```

- [ ] **Step 4: Add `getApproverByEmail` to approvals module**

Append to `apps/web/src/modules/approvals/queries.ts`:

```typescript
export async function getApproverByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
}
```

Add the missing `prisma` import at the top of that file — the full import line is:
```typescript
import { prisma, PendingActionStatus } from "@orgos/db";
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/modules/approvals/ apps/web/src/modules/dashboards/queries.ts
git commit -m "feat(approvals): add web queries + server actions for pending action resolution"
```

---

## Task 4: Daily Entry Form

**Files:**
- Create: `apps/web/src/modules/daily-inputs/components/DailyEntryForm.tsx`
- Create: `apps/web/src/app/submit/page.tsx`

The form uses the existing Zod schema. It is a client component that calls the `submitDailyEntry` server action. `userId` and `departmentId` come from URL search params (demo-grade: no auth yet).

- [ ] **Step 1: Create DailyEntryForm component**

Create `apps/web/src/modules/daily-inputs/components/DailyEntryForm.tsx`:

```tsx
"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { dailyEntryFormSchema, type DailyEntryFormValues } from "../schema";
import { submitDailyEntry } from "../actions/submitDailyEntry";

interface Props {
  userId: string;
  departmentId: string;
}

const EMPTY: DailyEntryFormValues = {
  date: new Date(),
  attendanceStatus: "",
  outputCompleted: "",
  blockers: "",
  engagementNotes: "",
  quickSummary: "",
};

export function DailyEntryForm({ userId, departmentId }: Props) {
  const [values, setValues] = React.useState<DailyEntryFormValues>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<keyof DailyEntryFormValues, string>>>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);

  function handleChange(field: keyof DailyEntryFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = dailyEntryFormSchema.safeParse({ ...values, date: new Date() });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DailyEntryFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus("submitting");
    setServerError(null);
    const result = await submitDailyEntry(userId, departmentId, parsed.data);
    if (result.success) {
      setStatus("success");
      setValues(EMPTY);
    } else {
      setStatus("error");
      setServerError(result.error);
    }
  }

  if (status === "success") {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "success.main", mb: 2 }} />
        <Typography variant="headlineLarge" sx={{ mb: 1 }}>
          Entry submitted
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Your daily report is being processed. Intelligence will update shortly.
        </Typography>
        <Button variant="outlined" onClick={() => setStatus("idle")}>
          Submit another
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {serverError && <Alert severity="error">{serverError}</Alert>}

        <TextField
          label="Attendance status"
          placeholder="e.g. 24 of 28 students present"
          value={values.attendanceStatus}
          onChange={handleChange("attendanceStatus")}
          error={!!errors.attendanceStatus}
          helperText={errors.attendanceStatus}
          fullWidth
          required
        />

        <TextField
          label="Outputs completed"
          placeholder="e.g. 12 assignments reviewed, 2 lesson plans submitted"
          value={values.outputCompleted}
          onChange={handleChange("outputCompleted")}
          error={!!errors.outputCompleted}
          helperText={errors.outputCompleted}
          fullWidth
          multiline
          minRows={2}
          required
        />

        <TextField
          label="Blockers"
          placeholder="Any obstacles today? Leave blank if none."
          value={values.blockers}
          onChange={handleChange("blockers")}
          fullWidth
          multiline
          minRows={2}
        />

        <TextField
          label="Engagement notes"
          placeholder="How was student engagement today?"
          value={values.engagementNotes}
          onChange={handleChange("engagementNotes")}
          fullWidth
          multiline
          minRows={2}
        />

        <TextField
          label="Quick summary"
          placeholder="1–2 sentence summary of today"
          value={values.quickSummary}
          onChange={handleChange("quickSummary")}
          error={!!errors.quickSummary}
          helperText={errors.quickSummary}
          fullWidth
          multiline
          minRows={2}
          required
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={status === "submitting"}
          startIcon={status === "submitting" ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{ alignSelf: "flex-start", px: 4 }}
        >
          {status === "submitting" ? "Submitting…" : "Submit daily report"}
        </Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Create submit page**

Create `apps/web/src/app/submit/page.tsx`:

```tsx
import { Box, Container, Typography } from "@mui/material";
import { DailyEntryForm } from "@/modules/daily-inputs/components/DailyEntryForm";

interface Props {
  searchParams: Promise<{ userId?: string; departmentId?: string }>;
}

export default async function SubmitPage({ searchParams }: Props) {
  const { userId, departmentId } = await searchParams;

  if (!userId || !departmentId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography color="error">
          Missing userId or departmentId in URL params.
          Use: /submit?userId=&lt;id&gt;&departmentId=&lt;id&gt;
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="headlineLarge" sx={{ mb: 0.5 }}>
          Daily Report
        </Typography>
        <Typography color="text.secondary">
          Takes 1–2 minutes. Your input drives the department intelligence layer.
        </Typography>
      </Box>
      <DailyEntryForm userId={userId} departmentId={departmentId} />
    </Container>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 4: Start dev server and test the form manually**

```bash
cd apps/web && pnpm dev
```

Navigate to the URL printed by the seed script (e.g. `/submit?userId=<id>&departmentId=dept-math`). Submit the form. Confirm the success state renders.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/daily-inputs/components/ apps/web/src/app/submit/
git commit -m "feat(ui): daily entry form + submit page"
```

---

## Task 5: Department Dashboard — Metrics Strip

**Files:**
- Create: `apps/web/src/modules/dashboards/department/MetricsStrip.tsx`

Reads the DAILY snapshot and renders four MetricCards: attendance, engagement, outputs, dropout. Uses the existing `MetricCard` component from `@orgos/ui`. The snapshot `data` shape is `Record<string, unknown[]>` — take the most recent value from each metric array.

- [ ] **Step 1: Create MetricsStrip component**

Create `apps/web/src/modules/dashboards/department/MetricsStrip.tsx`:

```tsx
import { Grid } from "@mui/material";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { MetricCard } from "@orgos/ui";
import type { ResolvedTrend } from "@orgos/shared-types";

interface Props {
  data: Record<string, unknown[]>;
}

function latestNumber(arr: unknown[]): number | null {
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function engagementLabel(arr: unknown[]): string {
  const val = arr.at(-1);
  if (typeof val === "string") return val.charAt(0) + val.slice(1).toLowerCase();
  return "—";
}

function attendanceTrend(arr: unknown[]): ResolvedTrend | undefined {
  if (arr.length < 2) return undefined;
  const prev = arr.at(-2) as number;
  const curr = arr.at(-1) as number;
  if (typeof prev !== "number" || typeof curr !== "number") return undefined;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.01) return { direction: "neutral", impact: "positive" };
  return delta > 0
    ? { direction: "up", impact: "positive" }
    : { direction: "down", impact: "negative" };
}

export function MetricsStrip({ data }: Props) {
  const attendance = latestNumber(data.attendance_rate ?? []);
  const outputs = latestNumber(data.output_count ?? []);
  const dropouts = latestNumber(data.dropout_count ?? []);
  const trend = attendanceTrend(data.attendance_rate ?? []);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          label="Attendance rate"
          value={attendance !== null ? `${Math.round(attendance * 100)}%` : "—"}
          trend={trend}
          period="vs yesterday"
          icon={PeopleAltOutlinedIcon}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          label="Engagement"
          value={engagementLabel(data.engagement_score ?? [])}
          icon={TrendingUpOutlinedIcon}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          label="Outputs completed"
          value={outputs ?? "—"}
          period="today"
          icon={AssignmentOutlinedIcon}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <MetricCard
          label="Dropout flags"
          value={dropouts ?? 0}
          trend={dropouts !== null && dropouts > 0 ? { direction: "up", impact: "negative" } : undefined}
          icon={WarningAmberOutlinedIcon}
        />
      </Grid>
    </Grid>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/modules/dashboards/department/MetricsStrip.tsx
git commit -m "feat(dashboard): MetricsStrip component — four MetricCards from daily snapshot"
```

---

## Task 6: Department Dashboard — Risks Panel

**Files:**
- Create: `apps/web/src/modules/dashboards/department/RisksPanel.tsx`

Reads `Alert[]` from `getRecentAlerts`. Renders each alert as a card with severity chip and description. Highest severity first. No pagination needed for the slice.

- [ ] **Step 1: Create RisksPanel component**

Create `apps/web/src/modules/dashboards/department/RisksPanel.tsx`:

```tsx
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { Alert } from "@orgos/shared-types";

const SEVERITY_COLOR = {
  LOW:      "default",
  MEDIUM:   "warning",
  HIGH:     "error",
  CRITICAL: "error",
} as const;

interface Props {
  alerts: Alert[];
}

export function RisksPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No active anomalies detected.</Typography>
      </Box>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <Stack spacing={1.5}>
      {sorted.map((alert) => {
        const meta = alert.metadata as Record<string, unknown> | null;
        const description = meta?.description as string | undefined;

        return (
          <Card key={alert.id} variant="outlined" sx={{ borderColor: alert.severity === "HIGH" || alert.severity === "CRITICAL" ? "error.main" : "divider" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 }, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Chip
                label={alert.severity}
                color={SEVERITY_COLOR[alert.severity]}
                size="small"
                sx={{ mt: 0.25, flexShrink: 0 }}
              />
              <Box>
                <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.25 }}>
                  {alert.type.replace(/_/g, " ")}
                </Typography>
                {description && (
                  <Typography variant="bodyLarge" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                    {description}
                  </Typography>
                )}
                <Typography variant="bodyLarge" sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>
                  {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/modules/dashboards/department/RisksPanel.tsx
git commit -m "feat(dashboard): RisksPanel — alert list with severity chips"
```

---

## Task 7: Department Dashboard — Insight Narrative Panel

**Files:**
- Create: `apps/web/src/modules/dashboards/department/InsightNarrativePanel.tsx`

Reads the WEEKLY snapshot (InsightReport shape). Renders: summary paragraph, risk bullets, recommendation list. This is the "AI is real" panel — the one that makes the demo compelling.

- [ ] **Step 1: Create InsightNarrativePanel component**

Create `apps/web/src/modules/dashboards/department/InsightNarrativePanel.tsx`:

```tsx
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import type { InsightReport } from "@orgos/shared-types";

interface Props {
  report: InsightReport;
}

export function InsightNarrativePanel({ report }: Props) {
  return (
    <Stack spacing={2.5}>
      {/* Summary */}
      <Box>
        <Typography variant="titleLarge" sx={{ mb: 1 }}>
          Weekly summary
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {report.summary}
        </Typography>
      </Box>

      <Divider />

      {/* Top risks */}
      {report.risks.length > 0 && (
        <Box>
          <Typography variant="titleLarge" sx={{ mb: 1 }}>
            Active risks
          </Typography>
          <Stack spacing={1}>
            {report.risks.map((risk, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1 }}>
                <Typography color="error.main" sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {risk.severity}
                </Typography>
                <Typography color="text.secondary">{risk.description}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <LightbulbOutlinedIcon sx={{ color: "warning.main", fontSize: 20 }} />
            <Typography variant="titleLarge">Recommendations</Typography>
          </Box>
          <List dense disablePadding>
            {report.recommendations.map((rec, i) => (
              <ListItem key={i} disableGutters sx={{ alignItems: "flex-start", gap: 1 }}>
                <Typography sx={{ color: "primary.main", fontWeight: 700, flexShrink: 0, pt: 0.25 }}>
                  {i + 1}.
                </Typography>
                <ListItemText
                  primary={rec}
                  slotProps={{ primary: { color: "text.secondary" } }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Box sx={{ pt: 0.5 }}>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
          Confidence: {Math.round(report.confidence * 100)}% · Generated {new Date(report.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Typography>
      </Box>
    </Stack>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/modules/dashboards/department/InsightNarrativePanel.tsx
git commit -m "feat(dashboard): InsightNarrativePanel — weekly summary, risks, recommendations"
```

---

## Task 8: Department Dashboard — Approval Queue Panel

**Files:**
- Create: `apps/web/src/modules/dashboards/department/ApprovalQueuePanel.tsx`

Reads `PendingActionRow[]`. Renders each action with a rationale excerpt and Approve / Reject buttons. On click, calls the server action and refreshes via `router.refresh()`. This panel makes governance visible — the most important credibility signal.

- [ ] **Step 1: Create ApprovalQueuePanel component**

Create `apps/web/src/modules/dashboards/department/ApprovalQueuePanel.tsx`:

```tsx
"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import type { PendingActionRow } from "@/modules/approvals/queries";
import { approvePendingAction, rejectPendingAction } from "@/modules/approvals/actions/resolveAction";

const URGENCY_COLOR = {
  IMMEDIATE: "error",
  "24H":     "warning",
  "7D":      "default",
} as const;

const PRIORITY_LABEL: Record<number, string> = { 0: "P0", 1: "P1", 2: "P2", 3: "P3" };

interface Props {
  actions: PendingActionRow[];
  approverId: string;
}

export function ApprovalQueuePanel({ actions, approverId }: Props) {
  const router = useRouter();
  const [resolving, setResolving] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  async function handleApprove(actionId: string) {
    setResolving(actionId);
    const result = await approvePendingAction(actionId, approverId);
    setResolving(null);
    if (result.success) {
      setFeedback({ id: actionId, message: "Action approved.", type: "success" });
      router.refresh();
    } else {
      setFeedback({ id: actionId, message: result.error, type: "error" });
    }
  }

  async function handleReject(actionId: string) {
    setResolving(actionId);
    const result = await rejectPendingAction(actionId, approverId);
    setResolving(null);
    if (result.success) {
      setFeedback({ id: actionId, message: "Action rejected.", type: "success" });
      router.refresh();
    } else {
      setFeedback({ id: actionId, message: result.error, type: "error" });
    }
  }

  if (actions.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No actions pending approval.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {actions.map((action) => (
        <Card key={action.id} variant="outlined">
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip label={PRIORITY_LABEL[action.priority] ?? "P?"} size="small" color="primary" variant="outlined" />
                <Chip
                  label={action.urgency}
                  size="small"
                  color={URGENCY_COLOR[action.urgency as keyof typeof URGENCY_COLOR] ?? "default"}
                />
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                Expires {new Date(action.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Typography>
            </Box>

            <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>
              {action.actionType.replace(/_/g, " ")}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.8125rem", mb: 1.5, lineHeight: 1.6 }}>
              {action.rationale}
            </Typography>

            {feedback?.id === action.id && (
              <Alert severity={feedback.type} sx={{ mb: 1.5, py: 0 }}>
                {feedback.message}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={resolving === action.id}
                onClick={() => handleApprove(action.id)}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                disabled={resolving === action.id}
                onClick={() => handleReject(action.id)}
              >
                Reject
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/dashboards/department/ApprovalQueuePanel.tsx
git commit -m "feat(dashboard): ApprovalQueuePanel — governance-gated approve/reject UI"
```

---

## Task 9: Department Intelligence Dashboard Page

**Files:**
- Create: `apps/web/src/app/departments/[departmentId]/page.tsx`

The server component page. Fetches all data in parallel, assembles the 4-panel layout. Display order: Metrics → Risks → Insights → Approvals (follows the display law: Risks → Metrics → Insights → Raw Data; for MVP, Metrics above the fold is acceptable for demo legibility).

- [ ] **Step 1: Create the dashboard page**

Create `apps/web/src/app/departments/[departmentId]/page.tsx`:

```tsx
import { Box, Container, Divider, Grid, Typography } from "@mui/material";
import { getDepartmentDashboard, getRecentAlerts, getWeeklyInsightSnapshot } from "@/modules/dashboards/queries";
import { getPendingActionsForDepartment, getApproverByEmail } from "@/modules/approvals/queries";
import { MetricsStrip } from "@/modules/dashboards/department/MetricsStrip";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { InsightNarrativePanel } from "@/modules/dashboards/department/InsightNarrativePanel";
import { ApprovalQueuePanel } from "@/modules/dashboards/department/ApprovalQueuePanel";
import type { Alert, InsightReport } from "@orgos/shared-types";

// Demo-grade: use the seeded dept head as the approver
const DEMO_APPROVER_EMAIL = "depthead@uncommon.org";

interface Props {
  params: Promise<{ departmentId: string }>;
}

export default async function DepartmentDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const [dailySnapshot, weeklySnapshot, rawAlerts, pendingActions, approver] = await Promise.all([
    getDepartmentDashboard(departmentId),
    getWeeklyInsightSnapshot(departmentId),
    getRecentAlerts(departmentId),
    getPendingActionsForDepartment(departmentId),
    getApproverByEmail(DEMO_APPROVER_EMAIL),
  ]);

  const metricsData = dailySnapshot?.data as Record<string, unknown[]> | null;
  const insightReport = weeklySnapshot?.data as InsightReport | null;
  // getRecentAlerts returns Prisma Alert rows — shape matches the Alert type from @orgos/shared-types
  const alerts = rawAlerts as Alert[];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="headlineLarge" sx={{ mb: 0.5 }}>
          Department Intelligence
        </Typography>
        <Typography color="text.secondary">
          Mathematics Department · Real-time operational overview
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left column — main content */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="titleLarge" sx={{ mb: 2 }}>
              Today's metrics
            </Typography>
            {metricsData ? (
              <MetricsStrip data={metricsData} />
            ) : (
              <Typography color="text.secondary">No metrics snapshot available yet.</Typography>
            )}
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Box>
            <Typography variant="titleLarge" sx={{ mb: 2 }}>
              Weekly intelligence
            </Typography>
            {insightReport ? (
              <InsightNarrativePanel report={insightReport} />
            ) : (
              <Typography color="text.secondary">
                No weekly insight generated yet. Submit entries to trigger analysis.
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Right column — signals + approvals */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="titleLarge" sx={{ mb: 2, color: "error.main" }}>
              Active risks
            </Typography>
            <RisksPanel alerts={alerts} />
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Box>
            <Typography variant="titleLarge" sx={{ mb: 2 }}>
              Pending approvals
            </Typography>
            <ApprovalQueuePanel
              actions={pendingActions}
              approverId={approver?.id ?? ""}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Start dev server and verify the full dashboard loads**

```bash
cd apps/web && pnpm dev
```

Navigate to `/departments/dept-math`. Verify all four panels render with seeded data:
- MetricsStrip shows attendance, engagement, outputs, dropout flags
- RisksPanel shows the seeded HIGH severity anomaly alert
- InsightNarrativePanel shows the weekly summary + risks + recommendations
- ApprovalQueuePanel shows the seeded pending action with Approve/Reject buttons

- [ ] **Step 4: Test the approval flow**

Click Approve on the pending action. Verify the card disappears after page refresh. Check the DB: the `PendingAction` record should have `status: APPROVED`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/departments/
git commit -m "feat(dashboard): department intelligence dashboard — 4 panels, full loop visible"
```

---

## Task 10: Homepage Navigation + End-to-End Demo Verification

**Files:**
- Modify: `apps/web/src/app/page.tsx`

Replace the placeholder with links to the two demo-critical pages.

- [ ] **Step 1: Update homepage**

Replace `apps/web/src/app/page.tsx`:

```tsx
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import Link from "next/link";
import { prisma } from "@orgos/db";

export default async function HomePage() {
  // Demo-grade: read the seeded instructor to build the submit URL
  const instructor = await prisma.user.findUnique({
    where: { email: "alex@uncommon.org" },
    select: { id: true },
  });

  const submitUrl = instructor
    ? `/submit?userId=${instructor.id}&departmentId=dept-math`
    : "/submit?userId=unknown&departmentId=dept-math";

  return (
    <Container maxWidth="sm" sx={{ py: 12 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="displayLarge" sx={{ mb: 1, fontWeight: 600, letterSpacing: "-0.03em" }}>
          OrgOS
        </Typography>
        <Typography variant="titleLarge" color="text.secondary">
          Organizational Operating System
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Button
          component={Link}
          href="/departments/dept-math"
          variant="contained"
          size="large"
          startIcon={<DashboardOutlinedIcon />}
          sx={{ justifyContent: "flex-start", px: 3 }}
        >
          Department Intelligence Dashboard
        </Button>

        <Button
          component={Link}
          href={submitUrl}
          variant="outlined"
          size="large"
          startIcon={<EditNoteOutlinedIcon />}
          sx={{ justifyContent: "flex-start", px: 3 }}
        >
          Submit Daily Report
        </Button>
      </Stack>

      <Typography variant="bodyLarge" color="text.secondary" sx={{ mt: 4, fontSize: "0.8125rem" }}>
        Demo department: Mathematics · 3 instructors · 14 days history
      </Typography>
    </Container>
  );
}
```

- [ ] **Step 2: Run full end-to-end demo walkthrough**

```bash
cd apps/web && pnpm dev
```

Walk the loop in order:
1. Open `/` — confirm both buttons appear
2. Click Dashboard — confirm all 4 panels load with seeded data
3. Click Approve on the pending action — confirm it resolves and the card disappears
4. Go back home, click Submit Daily Report
5. Fill in the form and submit — confirm success state renders
6. **Verify the pipeline fired** — open Prisma Studio (`cd packages/db && pnpm studio`) and check the `ExtractedMetric` table. A new row with the `entryId` of the just-submitted entry should exist within a few seconds. If it doesn't, check the server console for `submit_daily_entry.pipeline_error` log output.
7. Return to dashboard — confirm the DAILY snapshot `periodStart` has updated (or a new row exists in `DashboardSnapshot` for today)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(home): replace placeholder with demo navigation — dashboard + submit links"
```

---

## Done — Slice Complete

The vertical slice is done when this demo script works without interruption:

```
/ (homepage)
  → Click "Department Intelligence Dashboard"
    → Metrics strip shows attendance, engagement, outputs, dropout flags
    → Active risks panel shows anomaly alert (attendance decline)
    → Weekly intelligence shows AI-generated summary + recommendations
    → Pending approvals panel shows governance-gated action
      → Click Approve → action resolves
  → Go back
  → Click "Submit Daily Report"
    → Fill attendance, outputs, blockers, engagement, summary
    → Submit → success state
    → Pipeline fires in background (extractMetrics → anomaly detection → snapshot refresh)
```

OrgOS is real when that loop completes without error.
