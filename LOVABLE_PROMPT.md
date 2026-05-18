You are building **Uncommon OrgOS** — an Organizational Operating System for education nonprofits.

## Core Philosophy
Staff submit 1–2 min daily operational inputs. The system extracts metrics via AI, detects anomalies, and auto-generates ALL reports. Users never write reports. Reports are system-generated.

## Tech Stack
- Next.js 14 App Router (RSC + Server Actions + Client components)
- TypeScript strict mode
- MUI v6 (Material UI) component library
- MUI X-Charts for bar charts
- PostgreSQL + Prisma ORM
- pnpm monorepo (apps/web, services/*, packages/*)
- Fonts: IBM Plex Sans (body), Instrument Serif (display)
- Theme: dark tones, system grid background, accents via primary.main channel

## Monorepo Structure
```
apps/web/                    # Next.js app
  src/app/                   # App Router pages
  src/modules/               # Domain modules
    daily-inputs/            # Entry forms, submission, comments, edit requests
    youth-coding/            # Student mgmt, sessions, QR attendance, feedback
    dashboards/              # department/, instructor/, bootcamp/, program/, country/
    interventions/           # Alert queries
    approvals/               # Pending action queries + resolution
    report-generation/       # Weekly report approval
    users/                   # User queries
  src/components/            # Shared UI (UserBar, ErrorBoundary)
  src/lib/auth/              # Session, redirect-by-role, demo passwords
  src/lib/cron/              # Cron job runners
services/
  ingestion-engine/          # Daily entry validation + enqueue
  metric-extraction/         # Groq hybrid extraction (structured + narrative)
  anomaly-detection/         # End-of-day checks, spike detection, alert factory
  report-generator/          # Weekly + monthly report auto-generation + approval
  insight-engine/            # Insights v1, forecasting v2, autonomous actions v3, governance
  dashboard-engine/          # Snapshot refresh + read
  intervention-engine/       # Alert creation, intervention tracking
packages/
  db/                        # Prisma schema + client
  ui/                        # Shared component library
  shared-types/              # TypeScript types
  utils/                     # Env config, utilities
docs/
  prompts/                   # Versioned AI prompts (extraction-v1, weekly-summary-v1, monthly-summary-v1)
  architecture/              # ADRs (001-007)
```

## Database Schema (Prisma — PostgreSQL)

```
User
  id              String @id @default(cuid())
  email           String @unique
  name            String
  role            Role (enum)
  departmentId    String
  students        Student[]          @relation("InstructorStudents")
  dailyEntries    DailyEntry[]
  entryComments   EntryComment[]
  editRequests    EntryEditRequest[] (made + reviewed)
  alerts          Alert[]            @relation("AlertResolver")
  interventions   Intervention[]     @relation("InterventionAssignee")
  weeklyReports   WeeklyReport[]     @relation("WeeklyReportReviewer")
  monthlyReports  MonthlyReport[]    @relation("MonthlyReportReviewer")
  pendingActions  PendingAction[]    (approved + rejected)
  boardPolicies   BoardPolicy[]      @relation("PolicySetter")
  youthSessions   YouthCodingSession[] @relation("SessionSubmitter")

Department
  id                      String @id @default(cuid())
  name                    String
  parentDepartmentId      String? (self-ref hierarchy)
  parent/children         Department self-relation
  users, students, dailyEntries, weeklyReports, monthlyReports
  dashboardSnapshots, alerts, pendingActions, boardPolicies
  youthCodingSessions, attendanceSessions, fundingRecords, outcomeRecords

Student
  id                String @id @default(cuid())
  name, departmentId, instructorId, enrollmentStatus
  age, gender, school, grade, community (nullable, youth coding)
  sessionAttendance SessionAttendance[]
  reports           StudentReport[]
  attendanceRecords AttendanceRecord[]

DailyEntry (SOURCE OF TRUTH)
  id, userId, departmentId, date (unique per user+date)
  attendanceStatus  String  (structured narrative)
  outputCompleted   String  (structured narrative)
  blockers          String  (narrative)
  engagementNotes   String  (narrative)
  quickSummary      String  (free text)
  status            EntryStatus (SUBMITTED | PROCESSING | COMPLETE | FLAGGED)
  reportType        String  (DAILY | INCIDENT | SESSION)
  Structured fields (all nullable):
    totalStudents, studentsPresent, dropouts (Int?)
    maleStudents, femaleStudents, otherGender (Int?)
    averageAge (Float?), mentorshipPairs (Int?)
    engagementScore (String?)
    studentsInvolvedIds, dropoutStudentIds, dropoutReasons (Json?)
    guestsVisited (Boolean), guestNotes (String?)
  comments, editRequests, extractedMetrics, alerts

ExtractedMetric
  id, entryId, metricKey, metricValue (Json), confidence (Float)
  source (STRUCTURED | NARRATIVE | INFERRED), flagged, promptVersion

EntryComment
  id, entryId, authorId, body

EntryEditRequest
  id, entryId, requestedById, status (PENDING | APPROVED | DENIED), reviewedById, reviewNote

WeeklyReport
  id, departmentId, weekStart+weekEnd (unique per dept)
  status (DRAFT | UNDER_REVIEW | APPROVED | PUBLISHED)
  generatedContent, generatedMetrics, risks, originalContent (Json)
  editLog (Json default "[]"), promptVersion, reviewedById, reviewedAt

MonthlyReport
  id, departmentId, periodMonth+periodYear (unique per dept)
  Same fields as WeeklyReport

Alert
  id, type (MISSING_ENTRY | ANOMALY | INCONSISTENCY | RISK)
  severity (LOW | MEDIUM | HIGH | CRITICAL)
  resolved (Boolean), resolvedById, metadata (Json?)
  entryId?, weeklyReportId?, monthlyReportId?

Intervention
  id, alertId, issueType, severity
  assignedToId, status (OPEN | IN_PROGRESS | RESOLVED), notes, resolvedAt

PendingAction
  id, departmentId, actionType, target, priority, urgency
  executionMode (AUTO | HUMAN_APPROVAL | SYSTEM), rationale, payload (Json)
  status (PENDING | APPROVED | REJECTED | EXPIRED | EXECUTED)
  expiresAt, forecastRunId, approvedById, rejectedById

OutcomeRecord
  id, departmentId, forecastRunId, metricKey
  predictedValue (Float), actualValue (Float), forecastHorizon, measuredAt

BoardPolicy
  id, departmentId?, automationLevel (FULL | LIMITED | LOCKED)
  maxAutoRiskThreshold (Float), allowedAutoActions, forbiddenActions (Json)
  active, effectiveFrom, setByUserId

YouthCodingSession
  id, date, lessonNumber (Int), projectName, school, community
  departmentId, submittedById, instructorIds (Json)
  attendance SessionAttendance[]

SessionAttendance
  id, sessionId, studentId
  projectStatus (COMPLETE | NOT_COMPLETE)

StudentReport
  id, studentId, date, learned, enjoyed, struggled?, rating (Int)

AttendanceSession
  id, departmentId, date, token (unique), deviceIP?, isActive
  records AttendanceRecord[]

AttendanceRecord
  id, sessionId, studentId, checkedInAt

DashboardSnapshot
  id, departmentId?, scope (INDIVIDUAL | DEPARTMENT | PROGRAM | ORGANIZATION)
  periodType (DAILY | WEEKLY | MONTHLY | QUARTERLY | ANNUAL)
  periodStart, data (Json)

FundingRecord
  id, amount (Float), source, description?, receivedAt, programId?

GovernanceAuditRecord
  id, actionPlanId, actionType, departmentId, decision, reason, automationLevel, forecastRunId
```

## Roles (enum)
```
INSTRUCTOR | HUB_LEAD | BOOTCAMP_MANAGER | PROGRAM_MANAGER
COUNTRY_DIRECTOR | YOUTH_CODING_MANAGER | TEACHER_TRAINING_COORDINATOR
HEAD_OF_DESIGN | HEAD_OF_DEVELOPMENT | REGIONAL_HUB_LEAD
SAFEGUARDING | M_AND_E | MARKETING_COMMS_MANAGER
BUSINESS_DEVELOPMENT_MANAGER | BUSINESS_DEVELOPMENT_ASSOCIATE
HR_OFFICER | FINANCE_ADMIN_OFFICER | HEAD_OF_OPERATIONS | ADMIN | STUDENT
```

## Department Hierarchy (used by seeds)
```
Organization (root)
├── Youth Coding (Program)
│   ├── Hub Alpha
│   ├── Hub Beta
│   └── Hub Gamma
├── Bootcamp (Program)
│   ├── Bootcamp A
│   │   └── Hub A1
│   └── Bootcamp B
│       └── Hub B1
├── Teacher Training (Program)
└── Outreach (Program)
```

## Complete Page Inventory

### Auth
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` (server) | Redirects by role via `redirectByRole()` |
| `/login` | `LoginPage` + `LoginForm` | Email/password auth with demo accounts table |

### Instructor
| `/departments/[deptId]/instructors/[userId]` | `InstructorPage` | Full instructor dashboard: 3-tab view (Metrics, History, Student Reports), sidebar alerts, submit button |

### Hub Lead
| `/departments/[deptId]` | `DepartmentDashboardPage` | Hub dashboard: metrics strip, weekly intelligence insight, daily reports summary, YC panel, instructor grid, risk signals sidebar, approval queue |

### Submit Entry
| `/submit` | `SubmitPage` + `DailyEntryForm` | 3 report types: DAILY (attendance, outputs, engagement, blockers, dropouts with per-student reasons, guests toggle), INCIDENT (type, severity, students involved, description, action taken), SESSION (type, engagement, attendance numbers, outcomes). Zod validated. |

### Youth Coding Coordinator (STUDENT role)
| `/student` | `StudentDashboardPage` | Coordinator hub: registered students, sessions submitted, completion rate, nav links |
| `/submit-session` | — | Submit YC session |
| `/student/students` | — | View registered students |
| `/yc/feedback` | `StudentFeedbackPage` + `StudentReportForm` | Daily student feedback (learned, enjoyed, struggled, rating) |
| `/yc/attendance/[deptId]` | `HubAttendancePage` + `CheckInPanel` | QR code attendance check-in with student roster grid + QR display for scanning |
| `/yc/checkin` | `QRCheckInPage` | Token-based QR redirect → attendance page |

### Bootcamp Manager
| `/bootcamps/[deptId]` | `BootcampDashboardPage` | Metrics strip, YC panel, hub list with attendance/dropouts/engagement, alerts |

### Program Manager
| `/programs` | `ProgramsOverviewPage` | All programs: YC metrics + gender + hubs, Bootcamp hubs with attendance/dropouts, Teacher Training + Outreach weekly reports |
| `/programs/[deptId]` | `ProgramDashboardPage` | Per-program: YC (metrics, gender, hubs, weekly reports) or Bootcamp (bootcamps list) or generic (reports only) |

### Country Director
| `/country` | `CountryDirectorPage` | Org-wide KPIs, YC org panel, programs list, org-wide alerts |

### YC Manager
| `/youth-coding` | `YCMasterDatabasePage` + `YCMasterClient` | Master student DB per-hub filter, metrics, tabs for Student Reports / Instructor Entries / Weekly Reports |

### Impact Dashboard (Public-facing)
| `/impact` | `ImpactPage` + `ImpactClient` | Org-wide: overview KPIs (students, programs, hubs, funding with trend vs last year), YC tab (students, monthly sessions bar chart, completion rate, demographics, schools, communities), Bootcamp tab (students, attendance), funding chart, program funding distribution |

### System
| `/coming-soon` | `ComingSoonPage` | Placeholder for unbuilt roles |
| `/api/cron/daily` | Route handler | Daily processing |
| `/api/cron/weekly` | Route handler | Weekly report generation |
| `/api/cron/monthly` | Route handler | Monthly report generation |

## Auth / Navigation Flow
```
User hits / → getSessionUser()
  → no session → /login
  → has session → redirectByRole(role):
    INSTRUCTOR                → /departments/{id}/instructors/{userId}
    HUB_LEAD                  → /departments/{id}
    BOOTCAMP_MANAGER          → /bootcamps/{id}
    YOUTH_CODING_MANAGER      → /youth-coding
    TEACHER_TRAINING_COORD    → /programs/{id}
    PROGRAM_MANAGER           → /programs
    COUNTRY_DIRECTOR          → /country
    STUDENT                   → /student
    ADMIN                     → /departments/{id}
    other                     → /coming-soon
```
Each page also re-checks role authorization and redirects if unauthorized.

## End-to-End Data Flow
```
Staff submits DailyEntry via /submit (1-2 min)
  → Ingestion Engine validates + creates entry (status: SUBMITTED)
  → Metric Extraction extracts structured + narrative metrics → ExtractedMetrics
  → Anomaly Detection runs end-of-day checks (missing entries, spikes >2σ, gaps, contradictions)
    → Creates Alerts if issues found
      → Creates Interventions if severity ≥ HIGH
  → Dashboard Engine refreshes snapshots (continuous)
  → [Week close] Weekly Report Generator aggregates 7d metrics → DRAFT
    → Manager reviews/approves → APPROVED
  → [Month close] Monthly Report Generator aggregates approved weekly reports → DRAFT
    → Manager approves → APPROVED
  → Org rollup: Instructor → Dept → Program → Org
  → Impact Dashboard updated continuously
```

## Services (Intelligence Layer)

### ingestion-engine
- `ingestDailyEntry(input)` — validates + creates entry
- `validateEntry(input)` — Zod schema

### metric-extraction
- `extractMetrics(entry)` — orchestrates structured + narrative extraction
- `structuredExtraction(entry)` — deterministic mapping of totalStudents, studentsPresent, dropouts etc.
- `narrativeExtraction(entry)` — LLM extraction from free text (quickSummary, engagementNotes) via versioned prompt
- `resolveTrendImpact(metrics)` — semantic trend analysis
- `validateAITrend(trend)` — confidence verification

### anomaly-detection
- `runAnomalyDetection(departmentId, date)` — full pipeline
- `runEndOfDayChecks(departmentId, date)` — daily checks
- `createAlertsFromAnomalies(anomalies)` — creates Alert records
- Detects: missing entries, metric spikes (>2σ from 14d rolling avg), missing metrics, cross-field contradictions, late submissions (>24h)

### report-generator
- `generateWeeklyReport(departmentId, weekStart)` — aggregates ExtractedMetrics, LLM drafts via versioned prompt, stores originalContent
- `generateMonthlyReport(departmentId, month, year)` — aggregates approved WeeklyReports
- `approveReport(reportId, reviewerId)` — approval workflow

### insight-engine
- `generateWeeklyInsights(departmentId)` — insight narrative
- `generateMonthlyInsights(departmentId)` — monthly narrative
- `generateExecutiveSnapshot(departmentId)` — executive summary
- v2: `generateForecast(departmentId)` — predictive models
- v3: `generateActions(departmentId)` — AI-suggested actions, human approval queue, `approveAction`, `rejectAction`, `recordOutcomes`, `evaluatePredictionAccuracy`
- Governance: `guardAction(action, policy)`, `applyGovernancePolicy`, `getActiveBoardPolicy`, `getPendingActionsForApprover`

### dashboard-engine
- `refreshDepartmentSnapshot(departmentId)` — pre-computes metrics
- `getLatestSnapshot(departmentId)` — reads pre-computed snapshot

### intervention-engine
- `createAlert(type, severity, metadata)` — creates Alert
- `createIntervention(alertId, assigneeId)` — creates Intervention for HIGH/CRITICAL alerts
- `resolveIntervention(id)` — marks resolved
- `detectMissingEntries(departmentId, date)` — finds staff without entries on working days

## Key UI Components

### DailyEntryForm (client)
3 report types (radio cards): DAILY, INCIDENT, SESSION
- DAILY: attendanceStatus (textarea), outputCompleted, engagementNotes, blockers, guest toggle (Switch), dropout Autocomplete with per-student reason TextFields, quickSummary
- INCIDENT: type dropdown (Student Conflict, Safety Issue, etc.), severity dropdown (LOW/MEDIUM/HIGH), students Autocomplete, incident description, action taken, follow-up, summary
- SESSION: type dropdown (Workshop, Field Trip, etc.), engagement dropdown, studentsPresent + totalStudents numbers, outputs/outcomes, engagement notes, blockers, summary
- Zod validated before submission, success state with "Submit another" / "Back to Dashboard"

### InstructorTabs (client)
3 tabs: Metrics, History, Student Reports
- Metrics: stat cards grid (total students, avg attendance, dropouts, mentorship pairs, avg age, engagement, entries count, total outputs), YC panel, gender breakdown with visual bar, engagement trend (10-day color grid)
- History: scrollable entry list with badges (DAILY/INCIDENT/SESSION), expandable dropout details, guest notes, comments thread, RequestEditButton or EntryFeedbackPanel per entry
- Student Reports: recent student feedback table

### DepartmentDashboardPage (hub lead)
- Top bar: OrgOS wordmark, dept name, UserBar, active risks badge with pulsing red dot, date
- Main (8 cols): metrics strip (pre-computed snapshot), weekly intelligence report panel, daily reports summary (instructor submission grid), YCPanel (unique students, sessions, completion, school breakdown), instructor cards grid (avatar + name + email, clickable)
- Sidebar (4 cols): risk signals panel, approval queue panel with count badge

### YCPanel (reusable)
Stats row: unique students, sessions this month, completion rate, optional gender breakdown + school count

### RisksPanel (reusable)
Alert list: severity chip, type, description, date

### InsightNarrativePanel (reusable)
AI-generated weekly narrative with summary text and highlights

### ApprovalQueuePanel (reusable)
Pending actions list with approve/reject buttons per action

### EntryFeedbackPanel (reusable)
Comment thread (author avatar, name, body) + edit request approval/denial for hub leads

### CheckInPanel (reusable)
Student roster grid with toggle buttons (present/absent), QR code display, real-time attendance tracking

### YCMasterClient (client)
Full YC database: student table with search/filter by hub, metrics row, tabs for Student Reports / Instructor Entries / Weekly Reports table

### ImpactClient (client)
Org-wide impact: overview tab (total students, programs, hubs, funding with trend badge, cost/student, gender, school/community counts), YC tab (students, monthly bar chart, completion rate, demographics, schools, communities, avg age), Bootcamp tab (students, attendance), funding chart (MUI BarChart), program funding breakdown

### UserBar (shared)
Avatar circle with initials + name + role (horizontal layout)

## Trigger Flows (Cron)
```
npm run cron:daily   → /api/cron/daily   → end-of-day anomaly detection + dashboard refresh + missing entry alerts
npm run cron:weekly  → /api/cron/weekly  → generate WeeklyReports for all departments
npm run cron:monthly → /api/cron/monthly → generate MonthlyReports
```
All cron routes verify CRON_SECRET before executing.

## Demo Accounts
| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| Instructor | alex.rivera@uncommon.org | instructor | Submit daily reports, personal metrics |
| YC Instructor | instructor.yc1@uncommon.org | yc1 | YC instructor dashboard, session data |
| YC Coordinator | yc.student1@uncommon.org | yc.student1 | Submit sessions, manage students, QR attendance |
| Hub Lead | hublead@uncommon.org | hublead | Hub dashboard, instructors, approvals, YC panel |
| Hub Lead (Hub 2) | hublead2@uncommon.org | hublead2 | Hub 2 dashboard (lower-performance hub) |
| Hub Lead (Hub 3) | hublead3@uncommon.org | hublead3 | Hub 3 dashboard (active risk alerts) |
| Bootcamp Manager | bootcamp@uncommon.org | bootcamp | All hubs across design bootcamps |
| YC Manager | ycmanager@uncommon.org | ycmanager | YC master database, all-hub student roster |
| Program Manager | program@uncommon.org | program | All programs — YC, Bootcamp, Teacher Training, Outreach |
| Teacher Training Coord | pm.tt@uncommon.org | pm.tt | Teacher Training program view |
| Country Director | director@uncommon.org | director | Org-wide KPIs, all programs, org alerts |
| Admin | admin@uncommon.org | admin | Full system access |

## UI Conventions
- **Top bar**: sticky, backdrop-filter blur(12px), border-bottom divider, OrgOS wordmark with "OS" in primary.main, UserBar, date
- **Section headers**: Typography variant="overline", color="text.secondary", mb=2
- **Cards**: bgcolor="background.paper", border="1px solid" borderColor="divider", borderRadius=2, p={2.5 or 3}
- **Metric stats**: border card, overline label, large h3/h4 value
- **Empty states**: centered body2 text in text.secondary, optional icon
- **Risks/alerts**: error.main colored dot with boxShadow glow, severity chips (CRITICAL=error, HIGH=error, MEDIUM=warning, LOW=info)
- **Links/clickable cards**: no underline, hover → borderColor=primary.main + subtle shadow, transition 0.15s
- **Instructor avatars**: 32x32 circle, primary channel bg, initials uppercase
- **Grid**: MUI Grid2, 12-column, responsive (xs/sm/md/lg breakpoints)
- **Accent colors**: DAILY=primary, INCIDENT=error, SESSION=success (used across form, badges, timeline borders)
- **Engagement colors**: HIGH=success.main, MEDIUM=warning.main, LOW=error.main (used in chips, color grid, badges)

## Coding Conventions
- Named exports only (no default exports) for components
- Components under 150 lines — split if larger
- Business logic in services/queries files, never in components
- Server actions: validate with Zod, return `{ success: true, data }` or `{ success: false, error }`, never throw
- No `any` type — use `unknown` + narrow, or define proper types
- Types inferred from Zod schemas where possible
- Colocate test files with source code
- Phase discipline: don't build Phase N+1 features during Phase N
- All mutations through server actions
- Services call Prisma via `queries.ts` files — not inline
- Reports are system-generated only. `generatedContent` and `originalContent` never mutated. Edits stored in `editLog`.
- Prompts are versioned files in `docs/prompts/`. Never hardcoded. Never overwritten.

## What's Built
All phases partially implemented. Existing routes, components, services, DB schema, and data flows as documented above.

## Still to Complete
- Full weekly/monthly report auto-generation wiring (report-generator integration)
- Automated hierarchical rollup pipeline (triggered by approval events)
- Intervention module full UI (list, assign, resolve workflow)
- Comprehensive test coverage
- Production authentication (currently demo password-based)
- Onboarding/welcome flow for new users
- Some role-specific dashboards (Head of Design, Safeguarding, etc.)
