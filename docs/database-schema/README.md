# Database Schema

**Generated from Prisma schema at `packages/db/prisma/schema.prisma`**

---

## Overview

PostgreSQL database with 15 models and 12 enums backing the OrgOS organizational
operating system. The schema follows a strict "humans input daily entries, the
system generates everything else" architecture.

### Core Data Flow

```
User → DailyEntry → ExtractedMetric → WeeklyReport → MonthlyReport
                       ↓
                  Alert → Intervention
```

---

## Models

### User
Staff accounts with RBAC. Each user belongs to one Department and has one Role.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| email | String | Unique |
| name | String | — |
| role | Role (enum) | 19 values |
| departmentId | String | FK → Department |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Relations: Department, Students, DailyEntries, EntryComments, EntryEditRequests,
Alerts (resolved), Interventions (assigned), WeeklyReports (reviewed),
MonthlyReports (reviewed), PendingActions (approved/rejected), YouthCodingSessions
(submitted), BoardPolicies (set)

### Department
Hierarchy tree via self-referential parentDepartmentId. Represents hubs, programs,
and the organization root.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | — |
| parentDepartmentId | String? | FK → Department (self) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: parentDepartmentId

### Student
Learners tracked in youth coding and bootcamp programs.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | — |
| departmentId | String | FK → Department |
| instructorId | String | FK → User |
| enrollmentStatus | String | Default: ACTIVE |
| age | Int? | Nullable for pre-existing data |
| gender | String? | — |
| school | String? | — |
| grade | String? | — |
| community | String? | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: instructorId, departmentId

### DailyEntry — SOURCE OF TRUTH
Only human-authored entity. Staff submit one per day. All system intelligence flows
from this data.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| departmentId | String | FK → Department |
| date | Date | Per-user unique |
| attendanceStatus | String | Structured field |
| outputCompleted | String | Structured + narrative |
| blockers | String | Narrative |
| engagementNotes | String | Narrative |
| quickSummary | String | Free text summary |
| status | EntryStatus (enum) | SUBMITTED → PROCESSING → COMPLETE / FLAGGED |
| averageAge | Float? | Pre-parsed |
| dropouts | Int? | Pre-parsed |
| engagementScore | String? | Pre-parsed |
| femaleStudents | Int? | Pre-parsed |
| maleStudents | Int? | Pre-parsed |
| mentorshipPairs | Int? | Pre-parsed |
| otherGender | Int? | Pre-parsed |
| studentsPresent | Int? | Pre-parsed |
| totalStudents | Int? | Pre-parsed |
| reportType | String | Default: DAILY |
| studentsInvolvedIds | Json? | — |
| dropoutStudentIds | Json? | — |
| dropoutReasons | Json? | — |
| guestNotes | String? | — |
| guestsVisited | Boolean | Default: false |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Uniques: [userId, date]
Indexes: [departmentId, date], status, date

### EntryEditRequest
Workflow for requesting edits to a submitted DailyEntry.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| entryId | String | FK → DailyEntry |
| requestedById | String | FK → User |
| note | String | — |
| status | EditRequestStatus (enum) | PENDING / APPROVED / DENIED |
| reviewedById | String? | FK → User |
| reviewedAt | DateTime? | — |
| reviewNote | String? | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### EntryComment
Inline comments on daily entries for asynchronous discussion.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| entryId | String | FK → DailyEntry |
| authorId | String | FK → User |
| body | String | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### ExtractedMetric
AI-extracted metrics from DailyEntry narrative text and structured fields. Every
metric stores its source and confidence score.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| entryId | String | FK → DailyEntry |
| metricKey | String | Canonical key (attendance_rate, etc.) |
| metricValue | Json | Numeric or categorical |
| confidence | Float | 0–1, 1.0 for deterministic |
| source | MetricSource (enum) | STRUCTURED / NARRATIVE / INFERRED |
| flagged | Boolean | — |
| promptVersion | String | Version of prompt that generated this |
| createdAt | DateTime | Auto |

Indexes: entryId, metricKey, flagged

### WeeklyReport — SYSTEM GENERATED
Auto-generated from 7 days of extracted metrics. Manager reviews and approves.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| weekStart | Date | — |
| weekEnd | Date | — |
| departmentId | String | FK → Department |
| status | ReportStatus (enum) | DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED |
| generatedContent | Json | Narrative summary |
| generatedMetrics | Json | Aggregated KPIs |
| risks | Json | Flagged issues |
| originalContent | Json | Immutable — never mutated after generation |
| editLog | Json | Array of reviewer edits |
| promptVersion | String | Version of prompt that drafted this |
| reviewedById | String? | FK → User |
| reviewedAt | DateTime? | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Uniques: [departmentId, weekStart]
Indexes: status, departmentId

### MonthlyReport — SYSTEM GENERATED
Auto-generated from approved weekly reports. Also reviewable.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| periodMonth | Int | — |
| periodYear | Int | — |
| departmentId | String | FK → Department |
| status | ReportStatus (enum) | Same state machine as WeeklyReport |
| generatedContent | Json | Narrative summary |
| generatedMetrics | Json | Aggregated KPIs |
| originalContent | Json | Immutable |
| editLog | Json | Array of reviewer edits |
| promptVersion | String | — |
| reviewedById | String? | FK → User |
| reviewedAt | DateTime? | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Uniques: [departmentId, periodYear, periodMonth]

### Alert
System-detected issues — the output of anomaly detection. An intervention is
created for HIGH+ severity alerts.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| type | AlertType (enum) | MISSING_ENTRY / ANOMALY / INCONSISTENCY / RISK |
| severity | Severity (enum) | LOW / MEDIUM / HIGH / CRITICAL |
| resolved | Boolean | Default: false |
| resolvedById | String? | FK → User |
| entryId | String? | FK → DailyEntry |
| weeklyReportId | String? | FK → WeeklyReport |
| monthlyReportId | String? | FK → MonthlyReport |
| metadata | Json? | Anomaly metadata (anomalyId, ruleVersion) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: [severity, resolved], type, entryId

### Intervention
Action tracking for alerts that require human intervention. First-class module,
not a sidebar component.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| alertId | String | FK → Alert |
| issueType | String | — |
| severity | Severity (enum) | — |
| assignedToId | String | FK → User |
| status | InterventionStatus (enum) | OPEN → IN_PROGRESS → RESOLVED |
| notes | String | — |
| resolvedAt | DateTime? | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: status, assignedToId, alertId

### PendingAction
Insight Engine v3 action queue. Actions are planned by the intelligence layer and
either executed automatically or routed for human approval based on governance
policies.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| departmentId | String | FK → Department |
| actionType | String | — |
| target | String | Department, user, or metric key |
| priority | Int | 0 (highest) → N |
| urgency | String | — |
| executionMode | ActionExecutionMode (enum) | AUTO / HUMAN_APPROVAL / SYSTEM |
| rationale | String | — |
| payload | Json | Action parameters |
| status | PendingActionStatus (enum) | PENDING / APPROVED / REJECTED / EXPIRED / EXECUTED |
| approvedById | String? | FK → User |
| rejectedById | String? | FK → User |
| expiresAt | DateTime | — |
| executedAt | DateTime? | — |
| forecastRunId | String | — |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: [status, expiresAt], [departmentId, status], [priority, status]

### OutcomeRecord
Prediction accuracy tracking. Records what the Insight Engine v2 predicted vs.
what actually happened, enabling accuracy scoring and model improvement.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| departmentId | String | FK → Department |
| forecastRunId | String | — |
| metricKey | String | — |
| predictedValue | Float | — |
| actualValue | Float | — |
| forecastHorizon | String | 7D / 14D / 30D |
| measuredAt | DateTime | — |
| createdAt | DateTime | Auto |

Indexes: [departmentId, forecastHorizon], forecastRunId

### BoardPolicy
Governance rules controlling automation levels per department. Defines what
actions can be auto-executed vs. requiring human approval.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| departmentId | String? | FK → Department (null = org-wide) |
| automationLevel | AutomationLevel (enum) | FULL / LIMITED / LOCKED |
| maxAutoRiskThreshold | Float | Default: 0.6 |
| allowedAutoActions | Json | List of action types allowed for auto-execution |
| forbiddenActions | Json | List of action types never auto-executed |
| active | Boolean | Default: true |
| effectiveFrom | DateTime | — |
| setByUserId | String | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: [active, departmentId]

### YouthCodingSession
Record of a youth coding class session. Tracks lesson content, location, and
attendance.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| date | Date | — |
| lessonNumber | Int | — |
| projectName | String | — |
| school | String | — |
| community | String | — |
| departmentId | String | FK → Department |
| submittedById | String | FK → User |
| instructorIds | Json | Array of instructor user IDs |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Indexes: [departmentId, date], submittedById

### SessionAttendance
Per-student attendance in a youth coding session. Tracks project completion status.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| sessionId | String | FK → YouthCodingSession |
| studentId | String | FK → Student |
| projectStatus | ProjectStatus (enum) | COMPLETE / NOT_COMPLETE |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Uniques: [sessionId, studentId]

### StudentReport
Daily student feedback form. Students report what they learned, enjoyed, and
struggled with, plus a rating.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| studentId | String | FK → Student |
| date | Date | — |
| learned | String | — |
| enjoyed | String | — |
| struggled | String? | — |
| rating | Int | Default: 3 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### GovernanceAuditRecord
Immutable audit log for all governance decisions. Records every action that was
evaluated by the governance layer, including whether it was allowed, blocked, or
escalated.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| actionPlanId | String | — |
| actionType | String | — |
| departmentId | String | — |
| decision | String | ALLOWED / BLOCKED / ESCALATED |
| requiredLevel | String? | OrgNode level required for approval |
| reason | String | — |
| boardPolicyId | String? | — |
| automationLevel | String | — |
| forecastRunId | String | — |
| sourceLikelihood | Float | Used for policy simulation replay |
| createdAt | DateTime | Auto |

Indexes: [departmentId, createdAt], actionPlanId, forecastRunId

### FundingRecord
Tracks grant and donation income for reporting and impact dashboards.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| amount | Float | — |
| source | String | — |
| description | String? | — |
| receivedAt | Date | — |
| createdAt | DateTime | Auto |
| programId | String? | FK → Department |

### AttendanceSession
QR code-based attendance check-in session. An instructor creates a session with
a token that students scan to record attendance.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| departmentId | String | FK → Department |
| date | Date | — |
| token | String | Unique |
| deviceIP | String? | — |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Uniques: token, [departmentId, date]

### AttendanceRecord
Individual student QR check-in record within an AttendanceSession.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| sessionId | String | FK → AttendanceSession |
| studentId | String | FK → Student |
| checkedInAt | DateTime | Auto |

Uniques: [sessionId, studentId]

### DashboardSnapshot
Pre-computed dashboard data. Rather than querying raw data on every page load,
the dashboard engine computes snapshots at regular intervals.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| departmentId | String? | FK → Department |
| scope | SnapshotScope (enum) | INDIVIDUAL / DEPARTMENT / PROGRAM / ORGANIZATION |
| periodType | PeriodType (enum) | DAILY / WEEKLY / MONTHLY / QUARTERLY / ANNUAL |
| periodStart | Date | — |
| data | Json | Pre-computed metrics for this scope/period |
| createdAt | DateTime | Auto |

Indexes: [scope, periodType, periodStart], departmentId

---

## Enums

| Enum | Values |
|------|--------|
| Role | INSTRUCTOR, HUB_LEAD, BOOTCAMP_MANAGER, PROGRAM_MANAGER, COUNTRY_DIRECTOR, HEAD_OF_DESIGN, HEAD_OF_DEVELOPMENT, YOUTH_CODING_MANAGER, TEACHER_TRAINING_COORDINATOR, CAREER_DEVELOPMENT_OFFICER, REGIONAL_HUB_LEAD, SAFEGUARDING, M_AND_E, MARKETING_COMMS_MANAGER, BUSINESS_DEVELOPMENT_MANAGER, BUSINESS_DEVELOPMENT_ASSOCIATE, HR_OFFICER, FINANCE_ADMIN_OFFICER, HEAD_OF_OPERATIONS, ADMIN, STUDENT |
| EntryStatus | SUBMITTED, PROCESSING, COMPLETE, FLAGGED |
| MetricSource | STRUCTURED, NARRATIVE, INFERRED |
| ReportStatus | DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED |
| AlertType | MISSING_ENTRY, ANOMALY, INCONSISTENCY, RISK |
| Severity | LOW, MEDIUM, HIGH, CRITICAL |
| InterventionStatus | OPEN, IN_PROGRESS, RESOLVED |
| SnapshotScope | INDIVIDUAL, DEPARTMENT, PROGRAM, ORGANIZATION |
| PeriodType | DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL |
| EditRequestStatus | PENDING, APPROVED, DENIED |
| PendingActionStatus | PENDING, APPROVED, REJECTED, EXPIRED, EXECUTED |
| ActionExecutionMode | AUTO, HUMAN_APPROVAL, SYSTEM |
| AutomationLevel | FULL, LIMITED, LOCKED |
| ProjectStatus | COMPLETE, NOT_COMPLETE |

---

## Key Relationships

```
User ──→ Department (many-to-one)
DailyEntry ──→ User, Department (many-to-one)
ExtractedMetric ──→ DailyEntry (many-to-one)
WeeklyReport ──→ Department (many-to-one)
MonthlyReport ──→ Department (many-to-one)
Alert ──→ DailyEntry | WeeklyReport | MonthlyReport (nullable)
Intervention ──→ Alert (one-to-one)
PendingAction ──→ Department (many-to-one)
OutcomeRecord ──→ Department (many-to-one)
BoardPolicy ──→ Department (nullable) | User (many-to-one)
YouthCodingSession ──→ Department | User (many-to-one)
SessionAttendance ──→ YouthCodingSession | Student (many-to-one)
StudentReport ──→ Student (many-to-one)
AttendanceSession ──→ Department (many-to-one)
AttendanceRecord ──→ AttendanceSession | Student (many-to-one)
DashboardSnapshot ──→ Department (nullable)
Student ──→ Department | User (many-to-one)
FundingRecord ──→ Department (nullable)
```

---

## Index Strategy

- Foreign keys are indexed (all FK columns have @@index)
- Composites for access patterns: [departmentId, date] for daily entry queries,
  [severity, resolved] for alert queries, [scope, periodType, periodStart] for
  dashboard queries
- Unique constraints enforce business rules: one entry per user per day,
  one report per department per week/month, one attendance per session per student
