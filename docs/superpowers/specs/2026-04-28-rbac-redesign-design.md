# RBAC Redesign — Instructor Path

**Goal:** Replace the placeholder Role enum with the real Uncommon org roles, wire each role in the instructor path (Instructor → Hub Lead → Bootcamp Manager → Program Manager → Country Director) to its own scoped dashboard, and establish a data scoping utility that all queries use.

**Architecture:** Role-based routing using the existing `Department` `parentDepartmentId` tree as the scope boundary. A single `getAccessibleDepartmentIds` utility computes the correct department IDs for any role by walking the tree. Each role in the instructor path gets a dedicated Next.js page at a predictable URL. Cross-cutting roles (Safeguarding, M&E, etc.) get correct enum values now and a `/coming-soon` placeholder — dashboards built in a future slice.

**Tech Stack:** Prisma + PostgreSQL (department tree traversal), Next.js App Router (per-role pages), TypeScript strict mode (`exactOptionalPropertyTypes: true`), MUI v6.

> **Note:** This spec supersedes the role hierarchy in CLAUDE.md. After implementation, CLAUDE.md should be updated to reflect the new role names.

---

## Section 1 — Role Enum

Replace the current `Role` enum in `packages/db/prisma/schema.prisma`.

**Remove:** `DEPARTMENT_HEAD`, `PROGRAM_LEAD` (the others are retained or renamed).

**New enum:**
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

**Migration mapping** (seed is fully re-run — no live migration script needed):
- Old `DEPARTMENT_HEAD` → `HUB_LEAD`
- Old `PROGRAM_LEAD` → `PROGRAM_MANAGER`
- Old `PROGRAM_MANAGER` → `BOOTCAMP_MANAGER` (the old value was a rough approximation of this role)
- Old `HEAD_OF_OPERATIONS` → retained as `HEAD_OF_OPERATIONS`
- Old `ADMIN` → retained as `ADMIN`

---

## Section 2 — Department Tree Structure

The `Department` model is unchanged structurally — `parentDepartmentId` already supports the hierarchy. The seed creates a four-tier tree:

```
Organisation (root)
└── Design Program          [PROGRAM_MANAGER scope]
    └── Design Bootcamp     [BOOTCAMP_MANAGER scope]
        ├── Hub 1 — Design  [HUB_LEAD scope]
        ├── Hub 2 — Design  [HUB_LEAD scope]
        └── Hub 3 — Design  [HUB_LEAD scope]
```

### Data Scoping Utility

New file: `packages/utils/src/getAccessibleDepartmentIds.ts`

This utility is exported from `packages/utils/src/index.ts` (the existing barrel) alongside the other shared utilities.

**Dependency:** `packages/utils/package.json` must add `@orgos/db` as a dependency so the utility can accept a typed `PrismaClient` parameter. The parameter type uses the Prisma-generated `PrismaClient` from `@orgos/db`.

```ts
import type { PrismaClient } from "@orgos/db";

export async function getAccessibleDepartmentIds(
  role: string,
  departmentId: string,
  prisma: PrismaClient,
): Promise<string[]>
```

**Behaviour per role:**

| Role | Returns |
|------|---------|
| `INSTRUCTOR` | `[]` — scoped by `userId`, not department |
| `HUB_LEAD` | `[departmentId]` |
| `BOOTCAMP_MANAGER` | `[departmentId, ...childHubIds]` |
| `PROGRAM_MANAGER` | `[departmentId, ...bootcampIds, ...allHubIds]` |
| `COUNTRY_DIRECTOR` | all department IDs in the org |
| `ADMIN` | all department IDs in the org (ignores `departmentId` argument) |
| all other roles | all department IDs in the org (ignores `departmentId` argument) |

When `role` is `COUNTRY_DIRECTOR`, `ADMIN`, or any cross-cutting role, the `departmentId` argument is ignored — the function queries all departments unconditionally. This means passing `null` or an empty string for `departmentId` is safe for these roles.

**Implementation:** recursive traversal using Prisma `children` relation. Collect IDs depth-first. `COUNTRY_DIRECTOR` and cross-cutting roles skip the traversal and query all departments with no `where` filter.

---

## Section 3 — Routing Logic

### URL structure

```
/departments/[departmentId]/instructors/[userId]  → Instructor (existing, unchanged)
/departments/[departmentId]                        → Hub Lead dashboard
/bootcamps/[departmentId]                          → Bootcamp Manager dashboard
/programs/[departmentId]                           → Program Manager dashboard
/country                                           → Country Director dashboard
/coming-soon                                       → All other roles (placeholder)
```

### Root redirect (`apps/web/src/app/page.tsx`)

```ts
switch (user.role) {
  case "INSTRUCTOR":
    redirect(`/departments/${user.departmentId}/instructors/${user.id}`)
  case "HUB_LEAD":
    redirect(`/departments/${user.departmentId}`)
  case "BOOTCAMP_MANAGER":
    redirect(`/bootcamps/${user.departmentId}`)
  case "PROGRAM_MANAGER":
    redirect(`/programs/${user.departmentId}`)
  case "COUNTRY_DIRECTOR":
    redirect(`/country`)
  default:
    redirect(`/coming-soon`)
}
```

### Post-login redirect (`apps/web/src/lib/auth/actions.ts`)

Identical switch — mirrors the root redirect exactly.

### Role guards on each page

Every page verifies the session user's role on the server and redirects away if wrong. The switch for redirect targets is the same mapping above. Pages do not render for the wrong role — they redirect.

- `/departments/[departmentId]` — allow `HUB_LEAD` only; others redirected via switch
- `/bootcamps/[departmentId]` — allow `BOOTCAMP_MANAGER` only; others redirected via switch
- `/programs/[departmentId]` — allow `PROGRAM_MANAGER` only; others redirected via switch
- `/country` — allow `COUNTRY_DIRECTOR` only; others redirected via switch
- `ADMIN` is allowed through on all pages (no redirect)

---

## Section 4 — Dashboard Pages

### Hub Lead — `/departments/[departmentId]` (existing page, minimal changes)

The existing page already shows the right scope — aggregated metrics for one department, instructor list, risks, approval queue.

Changes:
- `isDeptHead` check updated: `role === "HUB_LEAD" || role === "ADMIN"` (was `DEPARTMENT_HEAD || ADMIN`). This check gates the `EntryFeedbackPanel` (comment + edit request review UI) on the instructor detail page — Hub Leads are the ones who review their instructors' entries.
- All UI copy: "Department Head" → "Hub Lead"
- Role guard: redirect non-`HUB_LEAD` users via the switch above

### Bootcamp Manager — `/bootcamps/[departmentId]` (new)

New file: `apps/web/src/app/bootcamps/[departmentId]/page.tsx`

Data: call `getAccessibleDepartmentIds("BOOTCAMP_MANAGER", departmentId, prisma)` to get all hub IDs, then query `DashboardSnapshot` and `Alert` for those IDs.

Layout:
1. **Metrics strip** — rolled-up totals across all hubs: total students, org attendance rate, total dropouts, active alert count
2. **Hub cards grid** — one card per hub: hub name, hub lead name, attendance rate, dropout count, engagement score, days since last submission, link → `/departments/[hubId]`
3. **Alerts feed** — all unresolved alerts across all hubs, severity-ordered, using existing `RisksPanel`

### Program Manager — `/programs/[departmentId]` (new)

New file: `apps/web/src/app/programs/[departmentId]/page.tsx`

Data: call `getAccessibleDepartmentIds("PROGRAM_MANAGER", departmentId, prisma)`, query `DashboardSnapshot` and `Alert` for all returned IDs.

Layout:
1. **Metrics strip** — rolled-up totals across all bootcamps + hubs
2. **Bootcamp cards grid** — one card per bootcamp: name, bootcamp manager name, hub count, rolled-up attendance + dropouts, link → `/bootcamps/[bootcampId]`
3. **Trends panel** — week-over-week changes (reuses `InsightNarrativePanel` if weekly snapshot data exists; omitted if not)

### Country Director — `/country` (new)

New file: `apps/web/src/app/country/page.tsx`

Data: all departments (no filter), all unresolved alerts.

Layout:
1. **Headline KPIs** — total students org-wide, org attendance rate, total dropouts this week, active alert count
2. **Programs grid** — one card per program: name, program manager name, bootcamp count, hub count, rolled-up metrics, link → `/programs/[programId]`
3. **Alerts feed** — all unresolved org-wide alerts, severity-ordered

### Coming Soon — `/coming-soon` (new, trivial)

New file: `apps/web/src/app/coming-soon/page.tsx`

A minimal page showing the user's name and role, with the message "Your dashboard is coming soon." and a sign-out link. No data fetched.

All new pages follow the existing visual language — same `UserBar`, `MetricsStrip`, `RisksPanel` components. No new design patterns introduced.

---

## Section 5 — Seed Data

Full re-seed. The seed script (`packages/db/prisma/seed.ts`) is rewritten to produce the new tree.

### Department tree

```
org (root)
└── Design Program
    └── Design Bootcamp
        ├── Hub 1 — Design
        ├── Hub 2 — Design
        └── Hub 3 — Design
```

### Users

| Role | Name | Email | Password |
|------|------|-------|----------|
| INSTRUCTOR | Alex Rivera | alex.rivera@uncommon.org | instructor |
| HUB_LEAD | Jordan Kim | hublead@uncommon.org | hublead |
| HUB_LEAD | Priya Nair | hublead2@uncommon.org | hublead |
| HUB_LEAD | Marcus Diallo | hublead3@uncommon.org | hublead |
| BOOTCAMP_MANAGER | Casey Morgan | bootcamp@uncommon.org | bootcamp |
| PROGRAM_MANAGER | Sam Torres | program@uncommon.org | program |
| COUNTRY_DIRECTOR | Morgan Ellis | director@uncommon.org | director |
| ADMIN | Admin User | admin@uncommon.org | admin |

- Jordan Kim (HUB_LEAD) is assigned to Hub 1; Priya Nair to Hub 2; Marcus Diallo to Hub 3
- Hub 1 gets 5 instructors including Alex Rivera; Hub 2 and Hub 3 get 5 instructors each
- Alex Rivera's 14-day daily entry history is fully preserved with the same data as today
- Hub 2 and Hub 3 instructors get 14 days of varied synthetic entries: attendance rates between 70–95%, dropout counts 0–2 per entry, engagement scores distributed across HIGH/MEDIUM/LOW to give the Bootcamp Manager and Program Manager dashboards meaningful non-uniform data to display

### Login page

`DEMO_ACCOUNTS` updated to list all five instructor-path roles plus ADMIN as active with correct credentials. The three additional Hub Lead accounts (Hub 2, Hub 3) are not listed in the demo panel — only Jordan Kim's `hublead@uncommon.org` is shown as the representative Hub Lead. Cross-cutting role rows removed entirely for now.

---

## Affected Files

### Modified
- `packages/db/prisma/schema.prisma` — Role enum replacement
- `packages/db/prisma/seed.ts` — full re-seed
- `packages/utils/src/index.ts` — export `getAccessibleDepartmentIds`
- `packages/utils/package.json` — add `@orgos/db` dependency
- `apps/web/src/app/page.tsx` — root redirect switch
- `apps/web/src/lib/auth/actions.ts` — post-login redirect switch
- `apps/web/src/app/departments/[departmentId]/page.tsx` — role guard + relabelling
- `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx` — `isDeptHead` → `HUB_LEAD`
- `apps/web/src/app/login/page.tsx` — demo accounts

### Created
- `packages/utils/src/getAccessibleDepartmentIds.ts` — scope utility
- `apps/web/src/app/bootcamps/[departmentId]/page.tsx` — Bootcamp Manager dashboard
- `apps/web/src/app/programs/[departmentId]/page.tsx` — Program Manager dashboard
- `apps/web/src/app/country/page.tsx` — Country Director dashboard
- `apps/web/src/app/coming-soon/page.tsx` — placeholder for unbuilt roles

---

## Out of Scope

- Cross-cutting role dashboards (Safeguarding, M&E, Marketing, etc.)
- Report generation triggered per role
- Notification/email routing per reporting line
- Permission-gated actions beyond page-level role guards (e.g. only Hub Lead can approve edit requests for their own hub's instructors)
- CLAUDE.md update (documentation task, handled separately after implementation)
