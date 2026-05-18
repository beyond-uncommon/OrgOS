# CLAUDE.md

# Project: Uncommon OrgOS
**Organizational Operating System**

Staff submit lightweight daily operational inputs.
The system extracts metrics, detects anomalies, and automatically generates
all weekly, monthly, and organizational reports.

Users do NOT write reports. The system generates everything from daily inputs.

---

# End-to-End Data Flow

```
Daily Inputs (All Staff)
        ↓
Metric Extraction Layer (Groq)
        ↓
Validation + Inconsistency Detection
        ↓
Daily Aggregation Engine
        ↓
Weekly Report Generation (Automated)
        ↓
Monthly Report Generation (Automated)
        ↓
Org-Level Rollups
        ↓
Impact Dashboard + Intervention System
```

---

# Tech Stack

## Frontend
- Next.js 14 (App Router)
- TypeScript (strict)
- Material UI v6 (MUI) — sx prop for styling
- MUI X (Charts, DataGrid)

## Backend
- PostgreSQL (Supabase/Neon)
- Prisma ORM

## AI
- Groq SDK (mixtral-8x7b-32768) for:
  - Metric extraction from daily narrative inputs
  - Weekly and monthly report drafting
  - Inconsistency and anomaly detection
  - Insight generation over rolling data
  - Risk flagging and trend reasoning

## Architecture
- Monorepo (pnpm workspaces)
- Domain-driven service modules
- Feature-based frontend organization
- 7 backend services + 4 shared packages

---

# Architecture Rules

Always favor:
- Modular design
- Reusable services
- Typed interfaces
- Separation of concerns
- Scalable patterns

Avoid:
- Monolithic files
- Business logic in UI components
- Duplicated logic
- Tightly coupled modules

Business logic belongs in services, not components.

---

# Folder Structure

```
apps/
  web/                      # Next.js application
services/
  ingestion-engine/         # Daily input handling + validation
  metric-extraction/        # Groq-based extraction (hybrid deterministic + LLM)
  anomaly-detection/        # Spike, gap, inconsistency detectors + severity rules
  intervention-engine/      # Alert creation + intervention tracking
  report-generator/         # Weekly + monthly auto-generation with approval workflow
  dashboard-engine/         # Pre-computed metric snapshots
  insight-engine/           # v1 aggregator + v2 predictive + v3 autonomous action + governance
packages/
  db/                       # Prisma client, migrations, seed (15+ models, 14 enums)
  ui/                       # Shared MUI component library (9 components)
  shared-types/             # Shared TypeScript types
  utils/                    # Shared utilities + env config + RBAC scoping
docs/
  architecture/             # ADRs (001-008)
  database-schema/          # Schema documentation
  prompts/                  # Versioned AI prompts (6 files)
```

---

# Frontend Modules

```
apps/web/src/modules/
  auth/                     # Auth server actions, session, redirect-by-role
  daily-inputs/             # Entry forms, submission history, comments, edit requests
  report-generation/        # Report viewing, approval workflows
  metrics/                  # Metric exploration
  insights/                 # AI-generated insights
  dashboards/               # Department, instructor, program, bootcamp, country views
  interventions/            # Alert management, action tracking
  approvals/                # Edit request approval workflows
  youth-coding/             # Session tracking, student registration, QR attendance, feedback
  users/                    # User management queries
```

---

# Core Database Model

| Table | Type | Notes |
|-------|------|-------|
| Users | Human | RBAC with 21 role enum |
| Departments | Human | Self-referential hierarchy tree |
| Students | Human | Youth coding + bootcamp learners |
| DailyEntries | **Human input** | Source of truth — only human-authored |
| EntryEditRequests | Human | Edit approval workflow |
| EntryComments | Human | Inline discussion on entries |
| ExtractedMetrics | System | AI-generated from daily entries |
| WeeklyReports | System | Auto-generated from 7 days of metrics |
| MonthlyReports | System | Auto-generated from approved weeklies |
| Alerts | System | Anomalies + risks detected |
| Interventions | System+Human | Action tracking for alerts |
| PendingActions | System | Insight Engine v3 action queue |
| OutcomeRecords | System | Prediction accuracy tracking |
| BoardPolicies | System+Human | Governance + automation rules |
| YouthCodingSessions | Human | Session tracking with attendance |
| SessionAttendance | Human | Per-student session status |
| StudentReports | Human | Student daily feedback |
| AttendanceSessions | System+Human | QR check-in sessions |
| AttendanceRecords | System | Per-student QR check-in records |
| GovernanceAuditRecords | System | Immutable governance decision log |
| FundingRecords | System+Human | Grant and donation tracking |
| DashboardSnapshots | System | Pre-computed performance views |

**DailyEntries = only human input. Everything else = system-generated.**

---

# DailyEntry — Source of Truth

Each staff member submits once per day (~1–2 minutes):

```
DailyEntry
  - attendanceStatus
  - outputCompleted
  - blockers
  - engagementNotes
  - quickSummary (free text)
  - (optional numeric fields: totalStudents, studentsPresent, dropouts, etc.)
```

Example input:
> "3 students absent, 2 completed assignments, engagement low in afternoon session"

This is the only data humans enter. Everything flows from here.

---

# Critical Reporting Rules

- **No manual weekly reports**
- **No manual monthly reports**
- **No duplicate summaries**
- **All reporting is system-generated**

Weekly reports aggregate 7 days of extracted metrics.
Monthly reports aggregate weekly reports.
Org rollups aggregate upward through the department hierarchy.

Humans only input raw daily data. The system reasons over it.

---

# Metric Extraction Rules

Groq extracts structured metrics from narrative daily inputs (hybrid approach):

| Raw Input | Extracted Metric |
|-----------|-----------------|
| "2 dropouts" | `dropout_count: 2` |
| "low engagement" | `engagement_score: LOW` |
| "missed class" | `attendance_flag: true` |
| "3 students absent" | `attendance_rate: calculated` |

Standardized output fields:
- `attendance_rate`
- `dropout_count`
- `engagement_score`
- `output_count`
- `blocker_present`
- `risk_flag`

Extraction strategy: deterministic rules first, LLM second. Hybrid > pure AI.

---

# Intelligence Layer

Metric extraction supports:
- Structured field extraction
- Narrative text extraction (via Groq LLM)
- Inconsistency detection across entries
- Anomaly flagging (spikes, gaps, contradictions)
- Trend detection over rolling windows
- Predictive forecasting (Insight Engine v2)
- Autonomous action planning (Insight Engine v3)

---

# Intervention System Rules

When the system detects:
- Dropout spike
- Persistent low engagement
- Missing data / submission gaps
- Anomalous patterns

It creates an Intervention record:
```
Intervention
  - issueType
  - severity
  - assignedToId
  - status (OPEN → IN_PROGRESS → RESOLVED)
  - notes
  - resolvedAt
```

Interventions are a first-class module, not an alert sidebar.

---

# Organizational Rollup Rules

Hierarchy-aware aggregation:
```
Instructor Level
→ Department/Hub Level
→ Program Level
→ Organization Level
```

Each level receives:
- Filtered insights relevant to that scope
- Relevant KPIs (pre-computed in DashboardSnapshots)
- Trend comparisons vs. prior periods

---

# Role Hierarchy (21 roles)

- INSTRUCTOR
- HUB_LEAD
- BOOTCAMP_MANAGER
- PROGRAM_MANAGER
- COUNTRY_DIRECTOR
- YOUTH_CODING_MANAGER
- TEACHER_TRAINING_COORDINATOR
- HEAD_OF_DESIGN / HEAD_OF_DEVELOPMENT
- HEAD_OF_OPERATIONS
- ADMIN
- STUDENT
- (plus: CAREER_DEVELOPMENT_OFFICER, REGIONAL_HUB_LEAD, SAFEGUARDING,
  M_AND_E, MARKETING_COMMS_MANAGER, BUSINESS_DEVELOPMENT_MANAGER,
  BUSINESS_DEVELOPMENT_ASSOCIATE, HR_OFFICER, FINANCE_ADMIN_OFFICER)

Enforced at 3 layers: middleware (routes) → server actions (operations) → query layer (data).

---

# Coding Standards

Always:
- Use strict TypeScript
- Prefer server actions where appropriate
- Write composable functions
- Keep components small
- Add types first
- Use Zod validation at all system boundaries
- Import shared UI from `@orgos/ui` (never duplicate components)

Produce production-quality code. Not tutorials. Not pseudo-code.

---

# Shared UI Components (@orgos/ui)

Available components in `packages/ui/src/components/`:
- **MetricCard** — KPI display with trend indicator
- **RiskCard** — Alert display with severity-aware styling
- **InsightCard** — AI insight card with confidence indicator
- **InterventionCard** — Action tracking with status transitions
- **StatusChip** — Unified status badge for all entity states
- **DashboardGrid** — Responsive Grid2 layout
- **TimelineSwitcher** — Daily/Weekly/Monthly toggle
- **DataTable** — MUI X DataGrid wrapper
- **InsightPanel** — Collapsible AI analysis accordion

Always use these instead of hand-rolling equivalents in modules.

---

# MVP Build Order

## Phase 1 — Foundation
1. Daily entry system
2. Role + department structure (21 roles)
3. Core database schema (22 tables)

## Phase 2 — Intelligence
4. Metric extraction (Groq, hybrid deterministic + LLM)
5. Weekly report generation

## Phase 3 — Reporting
6. Monthly report generation
7. Dashboard MVP (department, instructor, program, country views)

## Phase 4 — Interventions
8. Anomaly detection + Alert creation
9. Intervention tracking

## Phase 5+ — Advanced
10. Insight Engine v2 (predictive forecasting)
11. Insight Engine v3 (autonomous action planning)
12. Governance layer (board policies, audit)
13. Youth coding module (sessions, QR attendance, student feedback)
14. Impact dashboard (public, funding tracking)

---

# Prompt Engineering Rules

Prompts are code. Store in `docs/prompts/`. Version by filename. Never overwrite.
Active prompts: extraction-v1, weekly-summary-v1, monthly-summary-v1,
anomaly-classification-v1, insight-generation-v1, risk-prediction-v1.

---

# Dashboard Rules

Dashboards are views over shared intelligence data.
No siloed data sources. One data source, multiple views.
Metrics feed dashboards continuously — not on report submission.
All dashboards follow the priority order: Risks → Metrics → Insights → Data.

---

# Tests

Tests use Vitest. Run with `pnpm test` (root) or `pnpm --filter <service> test`.
Test files live in `__tests__/` within each service's `src/` directory.
17 test files exist across anomaly-detection and insight-engine services.

---

# Default Claude Behavior

When asked to build something:
1. Challenge architecture if needed
2. Suggest better structure if relevant
3. Identify risks
4. Then implement

Act like a thoughtful senior engineer, not a code generator.
