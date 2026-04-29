# RBAC Redesign — Instructor Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Role enum with real Uncommon org roles and build scoped dashboards for the full instructor reporting path: Instructor → Hub Lead → Bootcamp Manager → Program Manager → Country Director.

**Architecture:** The existing `Department.parentDepartmentId` tree encodes the 4-tier hierarchy (Hub → Bootcamp → Program → Org). A `getAccessibleDepartmentIds` utility walks this tree to compute each role's data scope. Each role gets a dedicated Next.js page; all queries filter by the IDs this utility returns.

**Tech Stack:** Prisma + Neon PostgreSQL, Next.js 14 App Router (server components), TypeScript strict mode (`exactOptionalPropertyTypes: true`), MUI v6.5, `@orgos/db`, `@orgos/utils`.

---

## File Map

### Created
- `packages/utils/src/getAccessibleDepartmentIds.ts` — scope utility, exported from barrel
- `apps/web/src/app/bootcamps/[departmentId]/page.tsx` — Bootcamp Manager dashboard
- `apps/web/src/app/programs/[departmentId]/page.tsx` — Program Manager dashboard
- `apps/web/src/app/country/page.tsx` — Country Director dashboard
- `apps/web/src/app/coming-soon/page.tsx` — placeholder for unbuilt roles
- `apps/web/src/modules/dashboards/bootcamp/queries.ts` — bootcamp-scoped data fetching
- `apps/web/src/modules/dashboards/program/queries.ts` — program-scoped data fetching
- `apps/web/src/modules/dashboards/country/queries.ts` — org-wide data fetching

### Modified
- `packages/db/prisma/schema.prisma` — Role enum replacement
- `packages/db/prisma/seed.ts` — full re-seed with 4-tier tree
- `packages/utils/src/index.ts` — add `getAccessibleDepartmentIds` export
- `packages/utils/package.json` — add `@orgos/db` dependency
- `apps/web/src/app/page.tsx` — root redirect switch
- `apps/web/src/lib/auth/actions.ts` — login redirect + demo passwords
- `apps/web/src/app/departments/[departmentId]/page.tsx` — role guard + relabel
- `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx` — isDeptHead → HUB_LEAD
- `apps/web/src/app/login/page.tsx` — demo accounts
- `apps/web/src/components/UserBar.tsx` — add new role labels

---

## Task 1: Replace Role Enum in Prisma Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Open `packages/db/prisma/schema.prisma` and replace the Role enum**

Find the existing enum (around line 11) and replace the entire block:

```prisma
enum Role {
  INSTRUCTOR
  HUB_LEAD
  BOOTCAMP_MANAGER
  PROGRAM_MANAGER
  COUNTRY_DIRECTOR
  HEAD_OF_DESIGN
  HEAD_OF_DEVELOPMENT
  YOUTH_CODING_MANAGER
  TEACHER_TRAINING_COORDINATOR
  CAREER_DEVELOPMENT_OFFICER
  REGIONAL_HUB_LEAD
  SAFEGUARDING
  M_AND_E
  MARKETING_COMMS_MANAGER
  BUSINESS_DEVELOPMENT_MANAGER
  BUSINESS_DEVELOPMENT_ASSOCIATE
  HR_OFFICER
  FINANCE_ADMIN_OFFICER
  HEAD_OF_OPERATIONS
  ADMIN
}
```

- [ ] **Step 2: Push schema to database**

```bash
npx pnpm --filter @orgos/db exec prisma db push
```

Expected: `🚀 Your database is now in sync with your Prisma schema.`

Note: `db push` will fail if any User rows exist with old enum values (`DEPARTMENT_HEAD`, `PROGRAM_LEAD`). If so, run this first to clear users (entries and snapshots will be re-seeded):

```bash
npx pnpm --filter @orgos/db exec prisma studio
# Delete all User rows via Studio, or run:
npx pnpm --filter @orgos/db exec prisma db execute --stdin <<'SQL'
DELETE FROM "User";
DELETE FROM "Student";
DELETE FROM "DailyEntry";
DELETE FROM "ExtractedMetric";
DELETE FROM "Alert";
DELETE FROM "DashboardSnapshot";
DELETE FROM "PendingAction";
SQL
```

Then re-run `prisma db push`.

- [ ] **Step 3: Verify Prisma client was regenerated**

```bash
grep -r "HUB_LEAD" node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/index.d.ts 2>/dev/null | head -3
```

Expected: lines containing `HUB_LEAD`.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: replace Role enum with real Uncommon org roles"
```

---

## Task 2: Add getAccessibleDepartmentIds Utility

**Files:**
- Create: `packages/utils/src/getAccessibleDepartmentIds.ts`
- Modify: `packages/utils/src/index.ts`
- Modify: `packages/utils/package.json`

- [ ] **Step 1: Add `@orgos/db` as a dependency to `packages/utils/package.json`**

```json
{
  "name": "@orgos/utils",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./env": "./src/env.ts"
  },
  "dependencies": {
    "@orgos/db": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Run install to link the workspace dependency**

```bash
npx pnpm install
```

Expected: no errors, lockfile updated.

- [ ] **Step 3: Create `packages/utils/src/getAccessibleDepartmentIds.ts`**

```ts
import type { PrismaClient } from "@orgos/db";

// Roles that see all departments regardless of their own departmentId
const ORG_WIDE_ROLES = new Set([
  "COUNTRY_DIRECTOR",
  "ADMIN",
  "SAFEGUARDING",
  "M_AND_E",
  "MARKETING_COMMS_MANAGER",
  "BUSINESS_DEVELOPMENT_MANAGER",
  "BUSINESS_DEVELOPMENT_ASSOCIATE",
  "HR_OFFICER",
  "FINANCE_ADMIN_OFFICER",
  "HEAD_OF_OPERATIONS",
]);

async function collectDescendantIds(
  prisma: PrismaClient,
  departmentId: string,
): Promise<string[]> {
  const children = await prisma.department.findMany({
    where: { parentDepartmentId: departmentId },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const nested = await collectDescendantIds(prisma, child.id);
    ids.push(...nested);
  }
  return ids;
}

/**
 * Returns the set of department IDs a user with the given role can access.
 *
 * - INSTRUCTOR: returns [] — scoped by userId, not department
 * - HUB_LEAD: returns [departmentId]
 * - BOOTCAMP_MANAGER: returns [departmentId, ...child hub IDs]
 * - PROGRAM_MANAGER: returns [departmentId, ...all bootcamp + hub IDs beneath]
 * - COUNTRY_DIRECTOR / ADMIN / cross-cutting roles: returns all department IDs
 *   (departmentId argument is ignored for these roles)
 */
export async function getAccessibleDepartmentIds(
  role: string,
  departmentId: string | null,
  prisma: PrismaClient,
): Promise<string[]> {
  if (role === "INSTRUCTOR") return [];

  if (ORG_WIDE_ROLES.has(role)) {
    const all = await prisma.department.findMany({ select: { id: true } });
    return all.map((d) => d.id);
  }

  if (!departmentId) return [];

  if (role === "HUB_LEAD") return [departmentId];

  // BOOTCAMP_MANAGER and PROGRAM_MANAGER: own dept + all descendants
  const descendants = await collectDescendantIds(prisma, departmentId);
  return [departmentId, ...descendants];
}
```

- [ ] **Step 4: Export from `packages/utils/src/index.ts`**

Add this line at the top of `packages/utils/src/index.ts`:

```ts
export { getAccessibleDepartmentIds } from "./getAccessibleDepartmentIds.js";
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx pnpm --filter @orgos/utils exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/utils/src/getAccessibleDepartmentIds.ts packages/utils/src/index.ts packages/utils/package.json pnpm-lock.yaml
git commit -m "feat: add getAccessibleDepartmentIds scope utility"
```

---

## Task 3: Re-seed Database with 4-Tier Department Tree

**Files:**
- Modify: `packages/db/prisma/seed.ts`

This is a full rewrite of the seed file. The goal is a tree: Org → Design Program → Design Bootcamp → Hub 1/2/3, with 15 instructors distributed across 3 hubs (5 each), and Alex Rivera's 14-day history preserved.

- [ ] **Step 1: Rewrite `packages/db/prisma/seed.ts`**

Replace the entire file contents with:

```ts
import {
  PrismaClient,
  Role,
  EntryStatus,
  AlertType,
  Severity,
  SnapshotScope,
  PeriodType,
  PendingActionStatus,
  ActionExecutionMode,
} from "@prisma/client";

const prisma = new PrismaClient();

// ── Instructor roster: 5 per hub ─────────────────────────────────────────────
const HUB1_INSTRUCTORS = [
  { email: "alex.rivera@uncommon.org",   name: "Alex Rivera"   },
  { email: "morgan.chen@uncommon.org",   name: "Morgan Chen"   },
  { email: "taylor.brooks@uncommon.org", name: "Taylor Brooks" },
  { email: "jordan.hayes@uncommon.org",  name: "Jordan Hayes"  },
  { email: "casey.nguyen@uncommon.org",  name: "Casey Nguyen"  },
];

const HUB2_INSTRUCTORS = [
  { email: "riley.patel@uncommon.org",   name: "Riley Patel"   },
  { email: "avery.santos@uncommon.org",  name: "Avery Santos"  },
  { email: "quinn.walker@uncommon.org",  name: "Quinn Walker"  },
  { email: "drew.okafor@uncommon.org",   name: "Drew Okafor"   },
  { email: "sage.williams@uncommon.org", name: "Sage Williams" },
];

const HUB3_INSTRUCTORS = [
  { email: "blake.torres@uncommon.org",  name: "Blake Torres"  },
  { email: "reese.kim@uncommon.org",     name: "Reese Kim"     },
  { email: "finley.lopez@uncommon.org",  name: "Finley Lopez"  },
  { email: "parker.james@uncommon.org",  name: "Parker James"  },
  { email: "skyler.wu@uncommon.org",     name: "Skyler Wu"     },
];

const FIRST_NAMES = [
  "Aisha","Marcus","Priya","Jordan","Lena","Darius","Sofia","Elias","Naomi","Theo",
  "Zara","Malik","Camille","Rafi","Yara","Dante","Imani","Ezra","Nadia","Caleb",
  "Layla","Kwame","Sienna","Jaden","Fatima","Noah","Amara","Tomas","Kezia","Adrian",
  "Mia","Leon","Chloe","Finn","Sasha","Omar","Vivian","Kael","Petra","Beau",
  "Ingrid","Cyrus","Alicia","Jasper","Nora","Solomon","Iris","Emeka","Clara","Remy",
];
const LAST_NAMES = [
  "Okafor","Rivera","Patel","Chen","Williams","Davis","Torres","Johnson","Singh","Kim",
  "Walker","Thomas","Martinez","Brown","Jackson","White","Harris","Martin","Garcia","Lee",
  "Thompson","Lewis","Robinson","Clark","Hall","Young","Allen","King","Wright","Scott",
  "Green","Baker","Adams","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips",
];

function studentName(seed: number): string {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length]}`;
}

async function seedInstructorEntries(
  instructors: { id: string }[],
  departmentId: string,
  today: Date,
  options: { attendanceRange: [number, number]; engagementBias: "positive" | "negative" | "neutral" },
) {
  const ATTENDANCE_STATUS = [
    "All students present.",
    "2 students absent — excused.",
    "1 student absent — unexcused.",
    "3 students absent — family notified.",
    "4 students absent — illness reported.",
  ];
  const OUTPUTS = [
    "3 assignments reviewed, 1 lesson plan submitted.",
    "2 portfolio pieces critiqued, group project check-in completed.",
    "4 concept sketches reviewed, peer feedback session run.",
    "1 capstone milestone submitted, 2 revisions reviewed.",
    "5 assignments graded, weekly progress notes updated.",
  ];
  const SUMMARIES = [
    "Productive session with strong output quality.",
    "Good engagement in morning, slower afternoon.",
    "Strong peer critique session, high participation.",
    "Steady progress. One student flagged for additional support.",
    "Workshop format worked well. Students highly engaged.",
  ];

  const [minAtt, maxAtt] = options.attendanceRange;

  for (const instructor of instructors) {
    for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      const existing = await prisma.dailyEntry.findUnique({
        where: { userId_date: { userId: instructor.id, date } },
      });
      if (existing) continue;

      const seed = instructor.id.charCodeAt(0) + daysAgo;
      const attendanceRate = minAtt + ((seed * 7) % (maxAtt - minAtt + 1));
      const totalStudents = 22 + (seed % 3);
      const studentsPresent = Math.round(totalStudents * (attendanceRate / 100));
      const dropouts = daysAgo % 7 === 0 ? 1 : 0;

      let engagementScore: "HIGH" | "MEDIUM" | "LOW";
      if (options.engagementBias === "positive") {
        engagementScore = seed % 3 === 0 ? "MEDIUM" : "HIGH";
      } else if (options.engagementBias === "negative") {
        engagementScore = seed % 3 === 0 ? "MEDIUM" : "LOW";
      } else {
        engagementScore = seed % 3 === 0 ? "HIGH" : seed % 3 === 1 ? "MEDIUM" : "LOW";
      }

      await prisma.dailyEntry.create({
        data: {
          userId: instructor.id,
          departmentId,
          date,
          status: EntryStatus.COMPLETE,
          reportType: "DAILY",
          attendanceStatus: ATTENDANCE_STATUS[seed % ATTENDANCE_STATUS.length],
          outputCompleted: OUTPUTS[seed % OUTPUTS.length],
          blockers: daysAgo % 5 === 0 ? "Equipment issues with projector in studio room." : "",
          engagementNotes: "",
          quickSummary: SUMMARIES[seed % SUMMARIES.length],
          totalStudents,
          studentsPresent,
          dropouts,
          engagementScore,
          guestsVisited: false,
        },
      });
    }
  }
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Clear existing data (order respects FK constraints) ───────────────────
  await prisma.entryEditRequest.deleteMany();
  await prisma.entryComment.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.extractedMetric.deleteMany();
  await prisma.dailyEntry.deleteMany();
  await prisma.pendingAction.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.boardPolicy.deleteMany();
  await prisma.outcomeRecord.deleteMany();
  await prisma.governanceAuditRecord.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.monthlyReport.deleteMany();
  // Delete departments leaf-first to respect self-referential FK
  await prisma.department.deleteMany({ where: { parentDepartmentId: { not: null } } });
  await prisma.department.deleteMany();

  // ── Department tree ───────────────────────────────────────────────────────
  const org = await prisma.department.create({
    data: { id: "org-root", name: "Uncommon" },
  });

  const program = await prisma.department.create({
    data: { id: "prog-design", name: "Design Program", parentDepartmentId: org.id },
  });

  const bootcamp = await prisma.department.create({
    data: { id: "boot-design", name: "Design Bootcamp", parentDepartmentId: program.id },
  });

  const hub1 = await prisma.department.create({
    data: { id: "dept-design", name: "Hub 1 — Design", parentDepartmentId: bootcamp.id },
  });
  const hub2 = await prisma.department.create({
    data: { id: "hub-2", name: "Hub 2 — Design", parentDepartmentId: bootcamp.id },
  });
  const hub3 = await prisma.department.create({
    data: { id: "hub-3", name: "Hub 3 — Design", parentDepartmentId: bootcamp.id },
  });

  // ── Leadership users ──────────────────────────────────────────────────────
  const director = await prisma.user.create({
    data: { email: "director@uncommon.org", name: "Morgan Ellis", role: Role.COUNTRY_DIRECTOR, departmentId: org.id },
  });

  const programManager = await prisma.user.create({
    data: { email: "program@uncommon.org", name: "Sam Torres", role: Role.PROGRAM_MANAGER, departmentId: program.id },
  });

  const bootcampManager = await prisma.user.create({
    data: { email: "bootcamp@uncommon.org", name: "Casey Morgan", role: Role.BOOTCAMP_MANAGER, departmentId: bootcamp.id },
  });

  const hubLead1 = await prisma.user.create({
    data: { email: "hublead@uncommon.org", name: "Jordan Kim", role: Role.HUB_LEAD, departmentId: hub1.id },
  });
  await prisma.user.create({
    data: { email: "hublead2@uncommon.org", name: "Priya Nair", role: Role.HUB_LEAD, departmentId: hub2.id },
  });
  await prisma.user.create({
    data: { email: "hublead3@uncommon.org", name: "Marcus Diallo", role: Role.HUB_LEAD, departmentId: hub3.id },
  });

  await prisma.user.create({
    data: { email: "admin@uncommon.org", name: "Admin User", role: Role.ADMIN, departmentId: org.id },
  });

  // ── Instructors ───────────────────────────────────────────────────────────
  const hub1Instructors = await Promise.all(
    HUB1_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub1.id } })
    )
  );
  const hub2Instructors = await Promise.all(
    HUB2_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub2.id } })
    )
  );
  const hub3Instructors = await Promise.all(
    HUB3_INSTRUCTORS.map((d) =>
      prisma.user.create({ data: { email: d.email, name: d.name, role: Role.INSTRUCTOR, departmentId: hub3.id } })
    )
  );

  const demoInstructor = hub1Instructors[0]!;

  // ── Students (22–24 per instructor) ───────────────────────────────────────
  const allInstructors = [...hub1Instructors, ...hub2Instructors, ...hub3Instructors];
  let studentSeed = 0;
  for (const instructor of allInstructors) {
    const count = 22 + (studentSeed % 3);
    for (let i = 0; i < count; i++) {
      await prisma.student.create({
        data: {
          name: studentName(studentSeed),
          departmentId: instructor.departmentId,
          instructorId: instructor.id,
          enrollmentStatus: "ACTIVE",
        },
      });
      studentSeed++;
    }
  }

  // ── Daily entries for all instructors ─────────────────────────────────────
  // Hub 1: good attendance (85-95%), mostly positive engagement
  await seedInstructorEntries(hub1Instructors, hub1.id, today, {
    attendanceRange: [85, 95],
    engagementBias: "positive",
  });

  // Hub 2: mixed attendance (70-85%), neutral engagement — shows contrast
  await seedInstructorEntries(hub2Instructors, hub2.id, today, {
    attendanceRange: [70, 85],
    engagementBias: "neutral",
  });

  // Hub 3: lower attendance (60-75%), negative bias — intentionally below spec's 70% floor to trigger the alert seeded below
  await seedInstructorEntries(hub3Instructors, hub3.id, today, {
    attendanceRange: [60, 75],
    engagementBias: "negative",
  });

  // ── Special entries for demo instructor (Alex Rivera) ─────────────────────
  const incidentDate = new Date(today);
  incidentDate.setDate(today.getDate() - 16);
  incidentDate.setHours(0, 0, 0, 0);

  const hub1Students = await prisma.student.findMany({
    where: { instructorId: demoInstructor.id },
    take: 2,
    select: { id: true },
  });

  await prisma.dailyEntry.create({
    data: {
      userId: demoInstructor.id,
      departmentId: hub1.id,
      date: incidentDate,
      status: EntryStatus.COMPLETE,
      reportType: "INCIDENT",
      attendanceStatus: "Student Conflict",
      outputCompleted: "Verbal altercation between two students during afternoon critique. Separated immediately. Both students removed from session and spoken to individually.",
      blockers: "Coordinator and both families notified same day.",
      engagementNotes: "Follow-up counseling session scheduled for both students tomorrow morning.",
      quickSummary: "Verbal conflict between two students during critique. Resolved on-site, escalated to coordinator and families.",
      engagementScore: "HIGH",
      studentsPresent: 2,
      guestsVisited: false,
      ...(hub1Students.length ? { studentsInvolvedIds: hub1Students.map((s) => s.id) } : {}),
    },
  });

  const sessionDate = new Date(today);
  sessionDate.setDate(today.getDate() - 19);
  sessionDate.setHours(0, 0, 0, 0);

  await prisma.dailyEntry.create({
    data: {
      userId: demoInstructor.id,
      departmentId: hub1.id,
      date: sessionDate,
      status: EntryStatus.COMPLETE,
      reportType: "SESSION",
      attendanceStatus: "Guest Lecture",
      outputCompleted: "Guest designer from local agency led a 90-minute brand identity workshop. Students completed 3 rapid logo sketches each.",
      blockers: "",
      engagementNotes: "Highest energy session this month. Students asked to book a follow-up.",
      quickSummary: "Guest workshop on brand identity. Exceptional engagement — best session of the month.",
      engagementScore: "HIGH",
      totalStudents: 24,
      studentsPresent: 23,
      guestsVisited: true,
      guestNotes: "1 guest designer from Blink Creative Agency.",
    },
  });

  // ── DashboardSnapshots (one daily + one weekly per hub) ───────────────────
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const hubConfigs = [
    { hub: hub1, attendanceVals: [0.88, 0.91, 0.87, 0.93, 0.90], engagement: ["HIGH","HIGH","MEDIUM","HIGH","HIGH"] },
    { hub: hub2, attendanceVals: [0.75, 0.78, 0.72, 0.80, 0.76], engagement: ["MEDIUM","MEDIUM","LOW","MEDIUM","HIGH"] },
    { hub: hub3, attendanceVals: [0.62, 0.65, 0.60, 0.58, 0.63], engagement: ["LOW","LOW","MEDIUM","LOW","LOW"] },
  ];

  for (const cfg of hubConfigs) {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: cfg.hub.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.DAILY,
        periodStart: yesterday,
        data: {
          attendance_rate: cfg.attendanceVals,
          engagement_score: cfg.engagement,
          output_count: [4, 5, 3, 4, 5],
          dropout_count: [0, 1, 0, 0, 1],
        },
      },
    });

    await prisma.dashboardSnapshot.create({
      data: {
        departmentId: cfg.hub.id,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.WEEKLY,
        periodStart: weekStart,
        data: {
          type: "WEEKLY",
          departmentId: cfg.hub.id,
          summary: cfg.hub.id === hub3.id
            ? "Hub 3 attendance has been declining for the past week. Engagement is predominantly LOW. Immediate intervention recommended."
            : "Hub performing within expected ranges. Engagement trending positive.",
          insights: [],
          correlations: [],
          risks: cfg.hub.id === hub3.id ? [
            { category: "OPERATIONAL", severity: "HIGH", description: "Attendance below 65% for 5 consecutive days.", evidence: [] },
          ] : [],
          recommendations: [],
          confidence: 0.78,
          generatedAt: new Date().toISOString(),
          promptVersion: "weekly-summary-v1",
        },
      },
    });
  }

  // ── Alert for Hub 3 attendance drop ──────────────────────────────────────
  const hub3Entry = await prisma.dailyEntry.findFirst({
    where: { departmentId: hub3.id },
    orderBy: { date: "desc" },
  });
  if (hub3Entry) {
    await prisma.alert.create({
      data: {
        type: AlertType.ANOMALY,
        severity: Severity.HIGH,
        resolved: false,
        entryId: hub3Entry.id,
        metadata: {
          anomalyType: "SPIKE",
          metricKey: "attendance_rate",
          description: "Attendance rate in Hub 3 dropped 28% below 14-day rolling average. Consecutive decline for 5 days.",
          detectedAt: new Date().toISOString(),
        },
      },
    });
  }

  // ── PendingAction ─────────────────────────────────────────────────────────
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.pendingAction.create({
    data: {
      departmentId: hub3.id,
      actionType: "student_engagement_intervention",
      target: hub3.id,
      priority: 1,
      urgency: "24H",
      executionMode: ActionExecutionMode.HUMAN_APPROVAL,
      rationale: "Hub 3 attendance declined 28% over 5 days. Engagement risk is HIGH. Recommended: initiate attendance recovery protocol.",
      payload: { alertType: "SPIKE", metricKey: "attendance_rate", daysDeclined: 5, avgRate: 0.63, instructorCount: 5 },
      forecastRunId: "seed-forecast-001",
      expiresAt,
      status: PendingActionStatus.PENDING,
    },
  });

  // ── BoardPolicy ───────────────────────────────────────────────────────────
  await prisma.boardPolicy.create({
    data: {
      departmentId: null,
      automationLevel: "LIMITED",
      maxAutoRiskThreshold: 0.6,
      allowedAutoActions: ["baseline_documentation", "engagement_opportunity_flag"],
      forbiddenActions: [],
      active: true,
      setByUserId: hubLead1.id,
    },
  });

  console.log("✓ Seed complete.");
  console.log(`  Org tree: ${org.name} → ${program.name} → ${bootcamp.name} → ${hub1.name} / ${hub2.name} / ${hub3.name}`);
  console.log(`  Instructors: ${allInstructors.length} (5 per hub)`);
  console.log(`  Demo instructor: ${demoInstructor.email}`);
  console.log(`  Hub Lead (Hub 1): hublead@uncommon.org / hublead`);
  console.log(`  Bootcamp Manager: bootcamp@uncommon.org / bootcamp`);
  console.log(`  Program Manager: program@uncommon.org / program`);
  console.log(`  Country Director: director@uncommon.org / director`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
npx ts-node --skip-project packages/db/prisma/seed.ts
```

Expected output ending with `✓ Seed complete.`

- [ ] **Step 3: Verify seed in database**

```bash
npx pnpm --filter @orgos/db exec prisma studio
```

Check: 6 departments exist, 13 users (1 director + 1 PM + 1 bootcamp + 3 hub leads + 5×3 instructors + 1 admin), 15×14 = 210 daily entries exist for instructors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat: re-seed with 4-tier department tree and real role users"
```

---

## Task 4: Update Routing (page.tsx + auth/actions.ts)

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/lib/auth/actions.ts`

A shared redirect helper keeps the switch in one place. Both files use the same logic.

- [ ] **Step 1: Rewrite `apps/web/src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirectByRole(user.role, user.departmentId, user.id);
}

export function redirectByRole(
  role: string,
  departmentId: string | null,
  userId: string,
): never {
  switch (role) {
    case "INSTRUCTOR":
      redirect(`/departments/${departmentId}/instructors/${userId}`);
    case "HUB_LEAD":
      redirect(`/departments/${departmentId}`);
    case "BOOTCAMP_MANAGER":
      redirect(`/bootcamps/${departmentId}`);
    case "PROGRAM_MANAGER":
      redirect(`/programs/${departmentId}`);
    case "COUNTRY_DIRECTOR":
      redirect(`/country`);
    default:
      redirect(`/coming-soon`);
  }
}
```

- [ ] **Step 2: Rewrite `apps/web/src/lib/auth/actions.ts`**

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@orgos/db";
import { getSessionCookieName } from "./session";

const DEMO_PASSWORDS: Record<string, string> = {
  "alex.rivera@uncommon.org":  "instructor",
  "hublead@uncommon.org":      "hublead",
  "bootcamp@uncommon.org":     "bootcamp",
  "program@uncommon.org":      "program",
  "director@uncommon.org":     "director",
  "admin@uncommon.org":        "admin",
};

async function setSessionAndRedirect(userId: string, role: string, departmentId: string | null) {
  const jar = await cookies();
  jar.set(getSessionCookieName(), userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  switch (role) {
    case "INSTRUCTOR":
      redirect(`/departments/${departmentId}/instructors/${userId}`);
    case "HUB_LEAD":
      redirect(`/departments/${departmentId}`);
    case "BOOTCAMP_MANAGER":
      redirect(`/bootcamps/${departmentId}`);
    case "PROGRAM_MANAGER":
      redirect(`/programs/${departmentId}`);
    case "COUNTRY_DIRECTOR":
      redirect(`/country`);
    default:
      redirect(`/coming-soon`);
  }
}

export async function login(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const expected = DEMO_PASSWORDS[email];
  if (!expected || expected !== password) {
    return { error: "Invalid email or password." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return { error: "Account not found." };

  await setSessionAndRedirect(user.id, user.role, user.departmentId);
  return null;
}

export async function loginAs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return;
  await setSessionAndRedirect(user.id, user.role, user.departmentId);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(getSessionCookieName());
  redirect("/login");
}
```

- [ ] **Step 3: Verify dev server starts without errors**

```bash
pkill -f "next dev"; sleep 1; npx pnpm --filter web dev &
sleep 8 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

Expected: `200`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/lib/auth/actions.ts
git commit -m "feat: update root and auth routing to use real role switch"
```

---

## Task 5: Update Hub Lead Dashboard + UserBar

**Files:**
- Modify: `apps/web/src/app/departments/[departmentId]/page.tsx`
- Modify: `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx`
- Modify: `apps/web/src/components/UserBar.tsx`

- [ ] **Step 1: Update `apps/web/src/components/UserBar.tsx` role labels**

Replace the `ROLE_LABEL` map:

```ts
const ROLE_LABEL: Record<string, string> = {
  INSTRUCTOR:                   "Instructor",
  HUB_LEAD:                     "Hub Lead",
  BOOTCAMP_MANAGER:             "Bootcamp Manager",
  PROGRAM_MANAGER:              "Program Manager",
  COUNTRY_DIRECTOR:             "Country Director",
  HEAD_OF_DESIGN:               "Head of Design",
  HEAD_OF_DEVELOPMENT:          "Head of Development",
  YOUTH_CODING_MANAGER:         "Youth Coding Manager",
  TEACHER_TRAINING_COORDINATOR: "Teacher Training",
  CAREER_DEVELOPMENT_OFFICER:   "Career Dev Officer",
  REGIONAL_HUB_LEAD:            "Regional Hub Lead",
  SAFEGUARDING:                 "Safeguarding",
  M_AND_E:                      "M&E",
  MARKETING_COMMS_MANAGER:      "Marketing & Comms",
  BUSINESS_DEVELOPMENT_MANAGER: "Business Dev Manager",
  BUSINESS_DEVELOPMENT_ASSOCIATE: "Business Dev",
  HR_OFFICER:                   "HR Officer",
  FINANCE_ADMIN_OFFICER:        "Finance & Admin",
  HEAD_OF_OPERATIONS:           "Head of Operations",
  ADMIN:                        "Admin",
};
```

- [ ] **Step 2: Update role guard in `apps/web/src/app/departments/[departmentId]/page.tsx`**

Find the current role check (around line 35):

```ts
if (sessionUser?.role === "INSTRUCTOR") {
  const { redirect } = await import("next/navigation");
  redirect(`/departments/${departmentId}/instructors/${sessionUser.id}`);
}
```

Replace with a full guard that allows only `HUB_LEAD` and `ADMIN` through:

```ts
if (!sessionUser) {
  const { redirect } = await import("next/navigation");
  redirect("/login");
}

const role = sessionUser.role;

if (role === "INSTRUCTOR") {
  const { redirect } = await import("next/navigation");
  redirect(`/departments/${departmentId}/instructors/${sessionUser.id}`);
}

if (role !== "HUB_LEAD" && role !== "ADMIN") {
  const { redirect } = await import("next/navigation");
  // Redirect each role to their correct dashboard
  if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
  else if (role === "PROGRAM_MANAGER") redirect(`/programs/${sessionUser.departmentId}`);
  else if (role === "COUNTRY_DIRECTOR") redirect("/country");
  else redirect("/coming-soon");
}
```

- [ ] **Step 3: Update the `DEMO_APPROVER_EMAIL` constant in the same file**

Change:
```ts
const DEMO_APPROVER_EMAIL = "depthead@uncommon.org";
```
To:
```ts
const DEMO_APPROVER_EMAIL = "hublead@uncommon.org";
```

- [ ] **Step 4: Update "Department Head" copy to "Hub Lead" in `apps/web/src/app/departments/[departmentId]/page.tsx`**

Find the hardcoded string `"Design Department"` in the top bar and replace it:
```ts
// Before
<Typography variant="body2" sx={{ color: "text.secondary" }}>
  Design Department
</Typography>

// After — use actual department name from data
```

Add `departmentName` to the data fetches. The existing query already calls `getDepartmentInstructors(departmentId)` which uses prisma. Add one more query alongside the existing `Promise.all`:

```ts
const dept = await prisma.department.findUnique({
  where: { id: departmentId },
  select: { name: true },
});
```

Import `prisma` at the top: `import { prisma } from "@orgos/db";` (if not already present — check existing imports).

Use it in the top bar: `{dept?.name ?? "Hub Dashboard"}`

- [ ] **Step 5: Update `isDeptHead` in `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx`**

Find line ~98:
```ts
const isDeptHead = sessionUser?.role === "DEPARTMENT_HEAD" || sessionUser?.role === "ADMIN";
```

Replace with:
```ts
const isDeptHead = sessionUser?.role === "HUB_LEAD" || sessionUser?.role === "ADMIN";
```

- [ ] **Step 6: Verify by logging in as Hub Lead**

Start dev server, navigate to `http://localhost:3000/login`, sign in as `hublead@uncommon.org` / `hublead`.

Expected: redirected to `/departments/dept-design`, sees Hub 1 dashboard with Hub Lead label in UserBar.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/departments apps/web/src/components/UserBar.tsx
git commit -m "feat: update hub lead dashboard — relabel, role guard, isDeptHead fix"
```

---

## Task 6: Build Bootcamp Manager Dashboard

**Files:**
- Create: `apps/web/src/modules/dashboards/bootcamp/queries.ts`
- Create: `apps/web/src/app/bootcamps/[departmentId]/page.tsx`

- [ ] **Step 1: Create `apps/web/src/modules/dashboards/bootcamp/queries.ts`**

```ts
import { prisma } from "@orgos/db";
import { getAccessibleDepartmentIds } from "@orgos/utils";

export async function getBootcampDashboardData(bootcampDepartmentId: string) {
  const hubIds = await getAccessibleDepartmentIds("BOOTCAMP_MANAGER", bootcampDepartmentId, prisma);
  // hubIds includes bootcampDepartmentId itself — filter to only direct children (hubs)
  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: bootcampDepartmentId },
    select: { id: true, name: true },
  });
  const hubIdList = hubs.map((h) => h.id);

  const [hubLeads, snapshots, lastEntries, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: hubIdList }, role: "HUB_LEAD" },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: hubIdList }, periodType: "DAILY" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.dailyEntry.findMany({
      where: { departmentId: { in: hubIdList } },
      orderBy: { date: "desc" },
      distinct: ["departmentId"],
      select: { departmentId: true, date: true },
    }),
    prisma.alert.findMany({
      where: { resolved: false, entry: { departmentId: { in: hubIdList } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // De-duplicate snapshots — keep latest per department
  const latestSnapshot = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { hubs, hubLeads, latestSnapshot, lastEntries, alerts, hubIds };
}
```

- [ ] **Step 2: Create `apps/web/src/app/bootcamps/[departmentId]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { prisma } from "@orgos/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getBootcampDashboardData } from "@/modules/dashboards/bootcamp/queries";
import type { Alert } from "@orgos/db";

interface Props {
  params: Promise<{ departmentId: string }>;
}

function daysSince(date: Date | null): string {
  if (!date) return "No entries";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function latestString(data: Record<string, unknown[]> | null, key: string): string | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "string" ? val : null;
}

export default async function BootcampDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "BOOTCAMP_MANAGER" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "PROGRAM_MANAGER") redirect(`/programs/${sessionUser.departmentId}`);
    else if (role === "COUNTRY_DIRECTOR") redirect("/country");
    else redirect("/coming-soon");
  }

  const bootcamp = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  if (!bootcamp) notFound();

  const { hubs, hubLeads, latestSnapshot, lastEntries, alerts } =
    await getBootcampDashboardData(departmentId);

  const hubLeadMap = new Map(hubLeads.map((hl) => [hl.departmentId, hl.name]));
  const lastEntryMap = new Map(lastEntries.map((e) => [e.departmentId, e.date]));

  // Rolled-up strip totals
  let totalAttendance = 0;
  let totalDropouts = 0;
  let hubsWithData = 0;
  for (const hub of hubs) {
    const snap = latestSnapshot.get(hub.id);
    const data = snap?.data as Record<string, unknown[]> | null;
    const att = latestMetric(data, "attendance_rate");
    const drop = latestMetric(data, "dropout_count");
    if (att !== null) { totalAttendance += att; hubsWithData++; }
    if (drop !== null) totalDropouts += drop;
  }
  const avgAttendance = hubsWithData > 0 ? (totalAttendance / hubsWithData * 100).toFixed(0) : "—";

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Top bar */}
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{bootcamp.name}</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Metrics strip */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Hubs", value: String(hubs.length) },
            { label: "Avg Attendance", value: `${avgAttendance}%` },
            { label: "Total Dropouts", value: String(totalDropouts) },
            { label: "Active Alerts", value: String(alerts.length) },
          ].map(({ label, value }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Hub cards */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Hubs</Typography>
            <Grid container spacing={2}>
              {hubs.map((hub) => {
                const snap = latestSnapshot.get(hub.id);
                const data = snap?.data as Record<string, unknown[]> | null;
                const att = latestMetric(data, "attendance_rate");
                const drop = latestMetric(data, "dropout_count");
                const eng = latestString(data, "engagement_score");
                const lastDate = lastEntryMap.get(hub.id) ?? null;
                const hubLead = hubLeadMap.get(hub.id) ?? "—";
                const engColor = eng === "HIGH" ? "success.main" : eng === "LOW" ? "error.main" : "warning.main";
                return (
                  <Grid key={hub.id} size={{ xs: 12 }}>
                    <Box
                      component={Link}
                      href={`/departments/${hub.id}`}
                      sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{hub.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Lead: {hubLead}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>{daysSince(lastDate)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 3 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Attendance</Typography>
                          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>{att !== null ? `${(att * 100).toFixed(0)}%` : "—"}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Dropouts</Typography>
                          <Typography variant="body2" sx={{ color: drop ? "error.main" : "text.primary", fontWeight: 600 }}>{drop ?? "—"}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Engagement</Typography>
                          <Typography variant="body2" sx={{ color: eng ? engColor : "text.secondary", fontWeight: 600 }}>{eng ?? "—"}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {/* Alerts */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Active Alerts</Typography>
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Verify by logging in as Bootcamp Manager**

Navigate to `http://localhost:3000/login`, sign in as `bootcamp@uncommon.org` / `bootcamp`.

Expected: redirected to `/bootcamps/boot-design`, sees 3 hub cards with metrics, alert count badge.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/dashboards/bootcamp apps/web/src/app/bootcamps
git commit -m "feat: build Bootcamp Manager dashboard with hub cards and alerts"
```

---

## Task 7: Build Program Manager Dashboard

**Files:**
- Create: `apps/web/src/modules/dashboards/program/queries.ts`
- Create: `apps/web/src/app/programs/[departmentId]/page.tsx`

- [ ] **Step 1: Create `apps/web/src/modules/dashboards/program/queries.ts`**

```ts
import { prisma } from "@orgos/db";

export async function getProgramDashboardData(programDepartmentId: string) {
  const bootcamps = await prisma.department.findMany({
    where: { parentDepartmentId: programDepartmentId },
    select: { id: true, name: true },
  });
  const bootcampIds = bootcamps.map((b) => b.id);

  // For each bootcamp, get its child hubs
  const hubsByBootcamp = new Map<string, { id: string; name: string }[]>();
  for (const bootcamp of bootcamps) {
    const hubs = await prisma.department.findMany({
      where: { parentDepartmentId: bootcamp.id },
      select: { id: true, name: true },
    });
    hubsByBootcamp.set(bootcamp.id, hubs);
  }

  const allHubIds = [...hubsByBootcamp.values()].flat().map((h) => h.id);

  const [bootcampManagers, snapshots, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: bootcampIds }, role: "BOOTCAMP_MANAGER" },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: allHubIds }, periodType: "DAILY" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.alert.findMany({
      where: { resolved: false, entry: { departmentId: { in: allHubIds } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  // Latest snapshot per hub
  const latestSnapshot = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { bootcamps, bootcampManagers, hubsByBootcamp, latestSnapshot, alerts };
}
```

- [ ] **Step 2: Create `apps/web/src/app/programs/[departmentId]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { prisma } from "@orgos/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getProgramDashboardData } from "@/modules/dashboards/program/queries";
import type { Alert } from "@orgos/db";

interface Props {
  params: Promise<{ departmentId: string }>;
}

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

export default async function ProgramDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "PROGRAM_MANAGER" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
    else if (role === "COUNTRY_DIRECTOR") redirect("/country");
    else redirect("/coming-soon");
  }

  const program = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  if (!program) notFound();

  const { bootcamps, bootcampManagers, hubsByBootcamp, latestSnapshot, alerts } =
    await getProgramDashboardData(departmentId);

  const managerMap = new Map(bootcampManagers.map((m) => [m.departmentId, m.name]));

  // Rolled-up totals across all hubs
  const allHubs = [...hubsByBootcamp.values()].flat();
  let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
  for (const hub of allHubs) {
    const data = latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
    const att = latestMetric(data, "attendance_rate");
    const drop = latestMetric(data, "dropout_count");
    if (att !== null) { totalAtt += att; hubsWithAtt++; }
    if (drop !== null) totalDropouts += drop;
  }
  const avgAtt = hubsWithAtt > 0 ? `${(totalAtt / hubsWithAtt * 100).toFixed(0)}%` : "—";

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{program.name}</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Metrics strip */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Bootcamps", value: String(bootcamps.length) },
            { label: "Total Hubs", value: String(allHubs.length) },
            { label: "Avg Attendance", value: avgAtt },
            { label: "Active Alerts", value: String(alerts.length) },
          ].map(({ label, value }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Bootcamps</Typography>
            <Grid container spacing={2}>
              {bootcamps.map((bootcamp) => {
                const hubs = hubsByBootcamp.get(bootcamp.id) ?? [];
                const manager = managerMap.get(bootcamp.id) ?? "—";
                // Aggregate hub metrics for this bootcamp
                let bAtt = 0; let bHubs = 0; let bDropouts = 0;
                for (const hub of hubs) {
                  const data = latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
                  const att = latestMetric(data, "attendance_rate");
                  const drop = latestMetric(data, "dropout_count");
                  if (att !== null) { bAtt += att; bHubs++; }
                  if (drop !== null) bDropouts += drop;
                }
                const bAvgAtt = bHubs > 0 ? `${(bAtt / bHubs * 100).toFixed(0)}%` : "—";
                return (
                  <Grid key={bootcamp.id} size={{ xs: 12 }}>
                    <Box
                      component={Link}
                      href={`/bootcamps/${bootcamp.id}`}
                      sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{bootcamp.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Manager: {manager}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{hubs.length} hub{hubs.length !== 1 ? "s" : ""}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 3 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Avg Attendance</Typography>
                          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>{bAvgAtt}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Dropouts</Typography>
                          <Typography variant="body2" sx={{ color: bDropouts > 0 ? "error.main" : "text.primary", fontWeight: 600 }}>{bDropouts}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Active Alerts</Typography>
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Verify by logging in as Program Manager**

Sign in as `program@uncommon.org` / `program`.

Expected: redirected to `/programs/prog-design`, sees 1 bootcamp card (Design Bootcamp, 3 hubs), metrics strip, alerts panel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/dashboards/program apps/web/src/app/programs
git commit -m "feat: build Program Manager dashboard with bootcamp cards"
```

---

## Task 8: Build Country Director Dashboard

**Files:**
- Create: `apps/web/src/modules/dashboards/country/queries.ts`
- Create: `apps/web/src/app/country/page.tsx`

- [ ] **Step 1: Create `apps/web/src/modules/dashboards/country/queries.ts`**

```ts
import { prisma } from "@orgos/db";

export async function getCountryDashboardData() {
  // Top-level programs (children of org-root)
  const orgRoot = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });

  const programs = orgRoot
    ? await prisma.department.findMany({
        where: { parentDepartmentId: orgRoot.id },
        select: { id: true, name: true },
      })
    : [];

  const programIds = programs.map((p) => p.id);

  // All alerts org-wide
  const alerts = await prisma.alert.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // All hubs (depth 3 from root): programs → bootcamps → hubs
  const bootcamps = await prisma.department.findMany({
    where: { parentDepartmentId: { in: programIds } },
    select: { id: true, name: true, parentDepartmentId: true },
  });
  const bootcampIds = bootcamps.map((b) => b.id);

  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: { in: bootcampIds } },
    select: { id: true },
  });
  const hubIds = hubs.map((h) => h.id);

  const [programManagers, snapshots, studentCount] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: programIds }, role: "PROGRAM_MANAGER" },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: hubIds }, periodType: "DAILY" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
  ]);

  const latestSnapshot = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { programs, programManagers, bootcamps, hubs, latestSnapshot, alerts, studentCount };
}
```

- [ ] **Step 2: Create `apps/web/src/app/country/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getCountryDashboardData } from "@/modules/dashboards/country/queries";
import type { Alert } from "@orgos/db";

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

export default async function CountryDirectorPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "COUNTRY_DIRECTOR" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
    else if (role === "PROGRAM_MANAGER") redirect(`/programs/${sessionUser.departmentId}`);
    else redirect("/coming-soon");
  }

  const { programs, programManagers, bootcamps, hubs, latestSnapshot, alerts, studentCount } =
    await getCountryDashboardData();

  const managerMap = new Map(programManagers.map((m) => [m.departmentId, m.name]));

  // Org-wide metrics from all hub snapshots
  let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
  for (const hub of hubs) {
    const data = latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
    const att = latestMetric(data, "attendance_rate");
    const drop = latestMetric(data, "dropout_count");
    if (att !== null) { totalAtt += att; hubsWithAtt++; }
    if (drop !== null) totalDropouts += drop;
  }
  const avgAtt = hubsWithAtt > 0 ? `${(totalAtt / hubsWithAtt * 100).toFixed(0)}%` : "—";

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Country Overview</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Headline KPIs */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Active Students", value: String(studentCount) },
            { label: "Org Attendance", value: avgAtt },
            { label: "Dropouts (Latest)", value: String(totalDropouts) },
            { label: "Active Alerts", value: String(alerts.length) },
          ].map(({ label, value }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Programs</Typography>
            <Grid container spacing={2}>
              {programs.map((program) => {
                const programBootcamps = bootcamps.filter((b) => b.parentDepartmentId === program.id);
                const programHubIds = new Set(
                  hubs
                    .filter((h) => programBootcamps.some((b) => {
                      // hubs whose parent is in this program's bootcamps
                      return latestSnapshot.has(h.id);
                    }))
                    .map((h) => h.id)
                );
                const manager = managerMap.get(program.id) ?? "—";
                return (
                  <Grid key={program.id} size={{ xs: 12 }}>
                    <Box
                      component={Link}
                      href={`/programs/${program.id}`}
                      sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{program.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Manager: {manager}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{programBootcamps.length} bootcamp{programBootcamps.length !== 1 ? "s" : ""}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Org-Wide Alerts</Typography>
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Verify by logging in as Country Director**

Sign in as `director@uncommon.org` / `director`.

Expected: redirected to `/country`, sees KPI strip (75 students, attendance, dropouts, 1 alert), 1 program card (Design Program), alerts panel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/dashboards/country apps/web/src/app/country
git commit -m "feat: build Country Director dashboard with org-wide KPIs"
```

---

## Task 9: Build /coming-soon Placeholder

**Files:**
- Create: `apps/web/src/app/coming-soon/page.tsx`

- [ ] **Step 1: Create `apps/web/src/app/coming-soon/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";

export default async function ComingSoonPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <Typography variant="h4" sx={{ color: "text.primary", mb: 2, letterSpacing: "-0.02em" }}>
          Dashboard coming soon
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
          {sessionUser?.name ?? "Your"} — {sessionUser?.role ?? ""}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Your role&apos;s dashboard is being built. Check back soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Verify by visiting `/coming-soon`**

Navigate directly to `http://localhost:3000/coming-soon`.

Expected: page renders with OrgOS header and "Dashboard coming soon" message.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/coming-soon
git commit -m "feat: add /coming-soon placeholder for unbuilt role dashboards"
```

---

## Task 10: Update Login Page Demo Accounts

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Update `DEMO_ACCOUNTS` in `apps/web/src/app/login/page.tsx`**

Replace the `DEMO_ACCOUNTS` array and the `isBuilt` check:

```tsx
const DEMO_ACCOUNTS = [
  { role: "Instructor",        email: "alex.rivera@uncommon.org", password: "instructor", access: "Submit daily reports, personal history" },
  { role: "Hub Lead",          email: "hublead@uncommon.org",     password: "hublead",    access: "Hub dashboard, instructor list, approval queue" },
  { role: "Bootcamp Manager",  email: "bootcamp@uncommon.org",    password: "bootcamp",   access: "All hubs in bootcamp, rolled-up metrics" },
  { role: "Program Manager",   email: "program@uncommon.org",     password: "program",    access: "All bootcamps in program, trends" },
  { role: "Country Director",  email: "director@uncommon.org",    password: "director",   access: "Org-wide KPIs, all programs, alerts" },
  { role: "Admin",             email: "admin@uncommon.org",       password: "admin",      access: "Full access" },
];
```

Remove the `isBuilt` variable and its conditional rendering — all accounts are now active. Remove `opacity: isBuilt ? 1 : 0.45` from the row `sx` prop, and remove the `{!isBuilt && <Typography ...>Coming soon</Typography>}` block.

Also update the footer caption at the bottom of the page:

```tsx
// Before
<Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.secondary" }}>
  Design Department · Demo environment
</Typography>

// After
<Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.secondary" }}>
  Instructor Path · Demo environment
</Typography>
```

- [ ] **Step 2: Verify login page renders correctly**

Navigate to `http://localhost:3000/login`.

Expected: 6 rows all at full opacity, no "Coming soon" labels, correct role names (Hub Lead, Bootcamp Manager, Program Manager, Country Director).

- [ ] **Step 3: Test each login end-to-end**

Sign in with each account and verify the redirect destination:

| Email | Expected redirect |
|-------|-------------------|
| alex.rivera@uncommon.org | `/departments/dept-design/instructors/{id}` |
| hublead@uncommon.org | `/departments/dept-design` |
| bootcamp@uncommon.org | `/bootcamps/boot-design` |
| program@uncommon.org | `/programs/prog-design` |
| director@uncommon.org | `/country` |
| admin@uncommon.org | `/coming-soon` (ADMIN has no specific page yet) |

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat: update login page with real role demo accounts"
```
