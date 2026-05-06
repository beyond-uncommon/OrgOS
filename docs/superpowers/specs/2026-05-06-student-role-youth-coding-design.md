# Student Role & Youth Coding Module — Design Spec
**Date:** 2026-05-06
**Status:** Approved

---

## Overview

Introduce a `STUDENT` staff role — a youth coding coordinator/trainee who reports to an `INSTRUCTOR`. Despite sharing a name with the `Student` model (which represents youth coding children), `STUDENT` is a **staff role** stored in the `User` table. STUDENT users submit structured youth coding session reports — capturing session details, school location, attendance, and per-student project progress. This data feeds into hub-level and org-level youth coding metrics, and powers a YC Master Database accessible to leadership.

> **Naming note:** `STUDENT` (uppercase) = staff role in `User.role`. `Student` (model) = the youth coding child being taught. These are distinct concepts.

---

## 1. Schema Changes

### Role enum
Add `STUDENT` to the existing `Role` enum.

### `Student` model (extend existing)
Add fields:
- `age Int`
- `gender String` — values: `"M"`, `"F"`, `"Other"`
- `school String` — the child's home school (demographic, not session location)
- `grade String`
- `community String`

> The `Student.instructorId` FK accepts any `User` ID, including STUDENT-role users. The relation name `"InstructorStudents"` reflects that the FK column is named `instructorId` — it does not imply the linked user must hold the INSTRUCTOR role.

### New model: `YouthCodingSession`
```prisma
model YouthCodingSession {
  id            String              @id @default(cuid())
  date          DateTime            @db.Date
  lessonNumber  Int
  projectName   String
  school        String              // session location school — authoritative for dashboard school breakdowns
  community     String              // session location community
  departmentId  String
  submittedById String
  instructorIds Json                // String[] — array of User cuid strings present at the session
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  department    Department          @relation(fields: [departmentId], references: [id])
  submittedBy   User                @relation("SessionSubmitter", fields: [submittedById], references: [id])
  attendance    SessionAttendance[]

  @@index([departmentId, date])
  @@index([submittedById])
}
```

**`instructorIds` shape:** `["cuid1", "cuid2", ...]` — an array of `User.id` strings. No FK constraint at the DB level; validated in the server action against users whose `departmentId` matches `YouthCodingSession.departmentId` (the session's hub, not the submitter's department — these are always the same in practice since a STUDENT can only submit for their own hub, but the validation key is the session's `departmentId`).

**School vs. Student.school:** `YouthCodingSession.school` is the physical location of the session and is the authoritative value for all dashboard school-breakdown queries. `Student.school` is the child's enrolled home school, used only for demographic reporting in the YC Master Database.

### New model: `SessionAttendance`
```prisma
model SessionAttendance {
  id            String             @id @default(cuid())
  sessionId     String
  studentId     String
  projectStatus ProjectStatus      @default(NOT_COMPLETE)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  session       YouthCodingSession @relation(fields: [sessionId], references: [id])
  student       Student            @relation(fields: [studentId], references: [id])

  @@unique([sessionId, studentId])
  @@index([sessionId])
  @@index([studentId])
}
```

**Absence representation:** A student who does not attend a session has **no `SessionAttendance` row** for that session. Dashboard completion rates are calculated as: `COMPLETE rows / total SessionAttendance rows` (i.e., over students present, not over enrolled students).

### New enum: `ProjectStatus`
```prisma
enum ProjectStatus {
  COMPLETE
  NOT_COMPLETE
}
```

---

## 2. Role Routing & Access

- **Login → `/student`** — STUDENT staff member lands on their personal dashboard
- **Visible to:** INSTRUCTOR (assigned), HUB_LEAD, BOOTCAMP_MANAGER, PROGRAM_MANAGER, COUNTRY_DIRECTOR, ADMIN
- **Navigation:** My Sessions, Submit Session, My Students
- Auth middleware adds one new routing case: `Role.STUDENT → /student`
- **My Students page** (`/student/students`) is scoped to the logged-in STUDENT user only. HUB_LEAD and above view youth coding student data through the hub dashboard YC panel and the YC Master Database — not through the My Students page.

---

## 3. Youth Coding Student Registration

- Youth coding students are registered on **first lesson only**
- Registration happens inline within the Submit Session form
- Fields collected per student: Full Name, Age, Gender, School (home school), Grade, Community
- Saved to the existing `Student` model with `instructorId` set to the submitting STUDENT user's `id`
- On subsequent sessions, registered students appear as a pre-populated checklist

---

## 4. Session Report Submission

**Route:** `/submit-session` (STUDENT role only)

**Form — Phase 1 (Session Details):**
- Date (defaults to today)
- Lesson Number (integer)
- Project Name (text)
- School Name (session location — text)
- Community (session location — text)
- Instructor(s) present (multi-select from users in the same department)

**Form — Phase 2 (Student Register):**
- If no students registered yet: inline registration mode — each row collects Full Name, Age, Gender, School, Grade, Community. Rows are saved to the `Student` model before session creation.
- If students exist: attendance checklist — each row shows student name + present checkbox + COMPLETE / NOT_COMPLETE toggle (toggle only enabled when present is checked)
- "Add student" row always available at the bottom for new enrollees

**On submit:**
- Creates one `YouthCodingSession` record
- Creates one `SessionAttendance` record **only for students whose present checkbox is checked** — unchecked students are excluded from the INSERT entirely. There is no `present` column on `SessionAttendance`; absence is represented solely by the absence of a row. The submit handler iterates the form's student list and inserts only checked rows.

---

## 5. My Students Page

**Route:** `/student/students` — STUDENT role only

A table of all youth coding students registered under the current STUDENT user:
- Columns: Full Name, Age, Gender, School, Grade, Community, Enrollment Status
- Inline editing for corrections
- Filterable by school

---

## 6. Dashboard Integration

### Instructor Dashboard (`/departments/[departmentId]/instructors/[userId]`)
New "Youth Coding" panel:
- Total unique youth coding students under their STUDENT staff members
- Sessions this week
- Completion rate (% COMPLETE across all SessionAttendance rows for these sessions)

### Hub Dashboard (`/departments/[departmentId]`)
New "Youth Coding" panel:
- Total unique students taught in this hub (distinct `studentId` count across all SessionAttendance rows for sessions where `departmentId` matches)
- Sessions this month
- Completion rate
- Breakdown by `YouthCodingSession.school` (session location)

### Bootcamp Dashboard
Aggregates hub-level YC metrics across all hubs in the bootcamp.

### Country Dashboard
Org-wide YC panel:
- Total unique youth coding students taught (all time + current month)
- Gender breakdown from `Student.gender` (M / F / Other)
- Distinct `YouthCodingSession.school` count
- Completion rate trend

### YC Master Database (`/youth-coding`)
**Access:** HUB_LEAD and above

A filterable, sortable master table of every registered youth coding student:
- Columns: Full Name, Age, Gender, School (home), Grade, Community, Hub, Instructor, Sessions Attended, Completion Rate
- Filters: hub, school, gender, grade
- CSV export

---

## 7. Data Flow

```
STUDENT submits session report
        ↓
YouthCodingSession + SessionAttendance created
        ↓
Hub dashboard queries distinct studentId count per departmentId
        ↓
Bootcamp aggregates across hubs
        ↓
Country dashboard shows org-wide totals
        ↓
YC Master Database shows full student roster
```

---

## 8. Seed Data

Add to existing seed:
- 1 demo STUDENT user per hub (3 total), each with `instructorId` set to the first `User` in that hub ordered by `createdAt ASC`
- 5 pre-registered youth coding students per STUDENT user (15 total)
- 3 submitted sessions per STUDENT user with attendance records (all 5 students present, mix of COMPLETE / NOT_COMPLETE)

---

## 9. Files to Create / Modify

### Schema
- `packages/db/prisma/schema.prisma` — add `STUDENT` role, extend `Student`, add `YouthCodingSession`, `SessionAttendance`, `ProjectStatus`

### Backend
- `packages/db/prisma/seed.ts` — add demo STUDENT users and session data
- `apps/web/src/modules/youth-coding/` — new module
  - `queries.ts` — session queries, student queries, dashboard rollup queries
  - `actions/submitSession.ts` — server action
  - `actions/registerStudent.ts` — server action
  - `actions/updateStudent.ts` — server action

### Frontend
- `apps/web/src/app/(dashboard)/student/page.tsx` — STUDENT dashboard
- `apps/web/src/app/(dashboard)/student/students/page.tsx` — My Students page
- `apps/web/src/app/(dashboard)/submit-session/page.tsx` — session submission form
- `apps/web/src/app/(dashboard)/youth-coding/page.tsx` — YC Master Database
- `apps/web/src/modules/youth-coding/components/SessionForm.tsx`
- `apps/web/src/modules/youth-coding/components/StudentRegisterRow.tsx`
- `apps/web/src/modules/youth-coding/components/YCPanel.tsx` — reusable dashboard panel

### Auth / Routing
- `apps/web/src/middleware.ts` (or equivalent auth routing) — add `STUDENT → /student`

### Dashboard Modifications
- `apps/web/src/modules/dashboards/instructor/queries.ts` — add YC summary
- `apps/web/src/modules/dashboards/bootcamp/queries.ts` — add YC aggregation
- `apps/web/src/modules/dashboards/country/queries.ts` — add org-wide YC totals
