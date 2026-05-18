# ARCHITECTURE.md

# Uncommon OrgOS — System Architecture (V2)

---

## System Identity

**Organizational Operating System (OrgOS)**

Four interlocked layers:
1. **Data capture** — daily operational inputs from staff
2. **Reasoning** — AI metric extraction and anomaly detection
3. **Reporting** — automated weekly, monthly, org-level reports
4. **Decision support** — live dashboards and intervention workflows

Users do not write reports. The system generates everything from daily inputs.

---

## System Layers

```
┌─────────────────────────────────────────────────────┐
│                     UI Layer                        │
│        Next.js App Router · Tailwind · RSC          │
├─────────────────────────────────────────────────────┤
│                 Application Layer                   │
│     Server Actions · API Routes · Middleware        │
├─────────────────────────────────────────────────────┤
│           Domain Service Modules                    │
│  ingestion · extraction · report-generator ·        │
│  dashboard-engine · intervention-engine             │
├─────────────────────────────────────────────────────┤
│               Intelligence Layer                    │
│   Metric Extraction · Anomaly Detection ·            │
│   Anomaly Detection · Summary Drafting              │
├─────────────────────────────────────────────────────┤
│                  Data Layer                         │
│            PostgreSQL · Prisma ORM                  │
└─────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
/
├── apps/
│   └── web/                        # Next.js application
├── services/
│   ├── ingestion-engine/           # Daily input handling + validation
│   ├── metric-extraction/          # Groq-based extraction pipeline (hybrid)
│   ├── anomaly-detection/          # Spike, gap, inconsistency detectors
│   ├── intervention-engine/        # Alert creation + intervention tracking
│   ├── report-generator/           # Weekly + monthly auto-generation
│   ├── dashboard-engine/           # Live metric aggregation + snapshots
│   └── insight-engine/             # v1 aggregator + v2 predictive + v3 autonomous action + governance
├── packages/
│   ├── db/                         # Prisma client + migrations + seed
│   ├── ui/                         # Shared MUI component library
│   ├── shared-types/               # Shared TypeScript types
│   └── utils/                      # Shared utilities + env config
├── docs/
│   ├── architecture/               # ADRs
│   ├── database-schema/            # Schema documentation
│   └── prompts/                    # Versioned AI prompts
```

---

## Frontend Module Structure

```
apps/web/modules/
  auth/
  daily-inputs/         # Entry forms, submission history
  report-generation/    # Report viewing, approval workflows
  metrics/              # Metric exploration
  insights/             # AI-generated insights
  dashboards/           # Live views
  interventions/        # Alert management, action tracking
  users/
  roles/
```

Each module follows:
```
<module>/
  components/     # UI scoped to this domain
  actions/        # Server actions
  services/       # Business logic
  hooks/          # Client hooks
  types.ts
  schema.ts
  queries.ts
```

---

## End-to-End Data Flow

```
Staff member submits DailyEntry (1–2 min)
              │
              ▼
DailyEntry created  (status: SUBMITTED)
              │
              ▼
┌─────────────────────────────────────┐
│         Ingestion Engine            │
│  - validates required fields        │
│  - flags incomplete submissions     │
│  - enqueues for extraction          │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Metric Extraction            │
│  - structured field mapping         │
│  - narrative LLM extraction         │
│  - confidence scoring               │
│  - standardizes to canonical fields │
└─────────────────────────────────────┘
              │
              ▼
ExtractedMetrics created
              │
              ▼
┌─────────────────────────────────────┐
│    Validation + Anomaly Detection   │
│  - missing metric flags             │
│  - spike detection                  │
│  - cross-entry inconsistencies      │
│  - submission gap detection         │
└─────────────────────────────────────┘
              │
              ├──→ Alerts created (if issues found)
              │         │
              │         └──→ Intervention records created (if severity ≥ HIGH)
              │
              ▼
Dashboard metrics updated (continuous)
              │
              ▼
        [At week close]
              │
              ▼
┌─────────────────────────────────────┐
│      Weekly Report Generation       │
│  - aggregates 7 days of metrics     │
│  - drafts narrative summary (LLM)   │
│  - flags risks                      │
│  - status: DRAFT                    │
└─────────────────────────────────────┘
              │
              ▼
Manager review → Approve / Edit → APPROVED
              │
              ▼
        [At month close]
              │
              ▼
┌─────────────────────────────────────┐
│      Monthly Report Generation      │
│  - aggregates approved weekly rpts  │
│  - drafts narrative summary (LLM)   │
│  - department performance           │
│  - risk trends                      │
│  - status: DRAFT                    │
└─────────────────────────────────────┘
              │
              ▼
Manager review → Approve → APPROVED
              │
              ▼
┌─────────────────────────────────────┐
│       Org-Level Rollup              │
│  Instructor → Dept → Program → Org  │
└─────────────────────────────────────┘
              │
              ▼
Impact Dashboard updated
```

---

## Core Database Schema

### Users
```
User
  id            UUID PK
  email         String unique
  name          String
  roleId        → Role
  departmentId  → Department
  createdAt
```

### Roles
```
Role (enum)
  INSTRUCTOR | HUB_LEAD | BOOTCAMP_MANAGER | PROGRAM_MANAGER |
  COUNTRY_DIRECTOR | YOUTH_CODING_MANAGER | TEACHER_TRAINING_COORDINATOR |
  HEAD_OF_DESIGN | HEAD_OF_DEVELOPMENT | HEAD_OF_OPERATIONS | ADMIN |
  STUDENT | CAREER_DEVELOPMENT_OFFICER | REGIONAL_HUB_LEAD |
  SAFEGUARDING | M_AND_E | MARKETING_COMMS_MANAGER |
  BUSINESS_DEVELOPMENT_MANAGER | BUSINESS_DEVELOPMENT_ASSOCIATE |
  HR_OFFICER | FINANCE_ADMIN_OFFICER
```

### Departments
```
Department
  id                  UUID PK
  name                String
  parentDepartmentId  → Department (nullable)
```

### DailyEntries — SOURCE OF TRUTH
```
DailyEntry
  id                UUID PK
  userId            → User
  departmentId      → Department
  date              Date (unique per user per day)
  attendanceStatus  String (structured)
  outputCompleted   String (structured + narrative)
  blockers          String (narrative)
  engagementNotes   String (narrative)
  quickSummary      String (free text)
  status            SUBMITTED | PROCESSING | COMPLETE | FLAGGED
  reportType        DAILY | INCIDENT | SESSION
  totalStudents     Int? (pre-parsed)
  studentsPresent   Int? (pre-parsed)
  dropouts          Int? (pre-parsed)
  engagementScore   String? (pre-parsed)
  averageAge        Float?
  femaleStudents    Int?
  maleStudents      Int?
  mentorshipPairs   Int?
  otherGender       Int?
  studentsInvolvedIds  Json?
  dropoutStudentIds    Json?
  dropoutReasons       Json?
  guestsVisited     Boolean
  guestNotes        String?
  createdAt
```

### ExtractedMetrics
```
ExtractedMetric
  id            UUID PK
  entryId       → DailyEntry
  metricKey     String        # attendance_rate, dropout_count, etc.
  metricValue   Json          # numeric or categorical
  confidence    Float
  source        STRUCTURED | NARRATIVE | INFERRED
  flagged       Boolean
  promptVersion String        # which prompt generated this
  createdAt
```

### WeeklyReports — SYSTEM GENERATED
```
WeeklyReport
  id                UUID PK
  weekStart         Date
  weekEnd           Date
  departmentId      → Department
  status            DRAFT | UNDER_REVIEW | APPROVED | PUBLISHED
  generatedContent  Json      # narrative summary
  generatedMetrics  Json      # aggregated metrics
  risks             Json      # flagged issues
  originalContent   Json      # preserved — never mutated after generation
  editLog           Json      # array of reviewer edits
  reviewedById      → User (nullable)
  reviewedAt        DateTime (nullable)
  createdAt
```

### MonthlyReports — SYSTEM GENERATED
```
MonthlyReport
  id                UUID PK
  periodMonth       Int
  periodYear        Int
  departmentId      → Department
  status            DRAFT | UNDER_REVIEW | APPROVED | PUBLISHED
  generatedContent  Json
  generatedMetrics  Json
  originalContent   Json
  editLog           Json
  reviewedById      → User (nullable)
  reviewedAt        DateTime (nullable)
  createdAt
```

### Alerts
```
Alert
  id          UUID PK
  entryId     → DailyEntry (nullable)
  reportId    → WeeklyReport | MonthlyReport (nullable)
  type        MISSING_ENTRY | ANOMALY | INCONSISTENCY | RISK
  severity    LOW | MEDIUM | HIGH | CRITICAL
  resolved    Boolean
  resolvedById → User (nullable)
  createdAt
```

### Interventions
```
Intervention
  id           UUID PK
  alertId      → Alert
  issueType    String
  severity     LOW | MEDIUM | HIGH | CRITICAL
  assignedToId → User
  status       OPEN | IN_PROGRESS | RESOLVED
  notes        String
  resolvedAt   DateTime (nullable)
  createdAt
```

### DashboardSnapshots
```
DashboardSnapshot
  id           UUID PK
  departmentId → Department (nullable)
  scope        INDIVIDUAL | DEPARTMENT | PROGRAM | ORGANIZATION
  periodType   DAILY | WEEKLY | MONTHLY
  periodStart  Date
  data         Json         # pre-computed metrics for this scope/period
  createdAt
```

---

## Intelligence Layer

### Metric Extraction

| Raw Input | Extracted Metric | Method |
|-----------|-----------------|--------|
| "3 students absent" | `attendance_rate` | Deterministic |
| "2 dropouts" | `dropout_count: 2` | LLM extraction |
| "low engagement" | `engagement_score: LOW` | LLM classification |
| "missed class" | `attendance_flag: true` | LLM + rule |
| "2 assignments completed" | `output_count: 2` | Deterministic |

Canonical metric fields:
- `attendance_rate` — percentage
- `dropout_count` — integer
- `engagement_score` — LOW / MEDIUM / HIGH
- `output_count` — integer
- `blocker_present` — boolean
- `risk_flag` — boolean

Strategy: deterministic rules first → LLM second → confidence score always stored.

### Anomaly Detection

| Type | Trigger |
|------|---------|
| Missing entry | Staff member has no DailyEntry for a working day |
| Spike | Metric deviates > threshold from rolling 14-day avg |
| Gap | Metric absent for a period it previously appeared |
| Contradiction | Cross-field logical inconsistency within one entry |
| Late submission | Entry submitted > 24h after the entry date |

### Summary Generation

1. Aggregate ExtractedMetrics over the period
2. Identify trends and anomalies in the aggregated data
3. Generate narrative summary via LLM (versioned prompt)
4. Score confidence, flag unresolved risks
5. Store as DRAFT — preserve `originalContent`
6. Trigger reviewer notification

---

## Organizational Rollup Engine

```
DailyEntries (per staff member)
  → WeeklyReports (per department)
    → MonthlyReports (per department)
      → RollupReport: DEPARTMENT
        → RollupReport: PROGRAM
          → RollupReport: ORGANIZATION
```

Rules:
- Each level aggregates strictly from the level below
- A rollup cannot generate until all contributing records are APPROVED
- Each rollup stores its own pre-computed metrics — never recomputed at read time
- Rollup generation is triggered by approval events

---

## RBAC Data Scoping

| Role | Data Scope |
|------|-----------|
| INSTRUCTOR | Own daily entries; own dept summaries (read) |
| HUB_LEAD | Full department entries + weekly/monthly reports |
| BOOTCAMP_MANAGER | Bootcamp program data + rollups |
| PROGRAM_MANAGER | Cross-department program data + rollups |
| COUNTRY_DIRECTOR | Country-level org data + all rollups |
| YOUTH_CODING_MANAGER | Youth coding program data + rollups |
| HEAD_OF_OPERATIONS | Full org data + all rollups |
| ADMIN | Everything + system configuration |

Enforced at: middleware (routes) → server actions (operations) → query layer (data).

---

## AI Prompt Registry

| Use Case | Prompt File |
|----------|------------|
| Metric extraction from daily entry | `docs/prompts/extraction-v1.md` |
| Weekly report drafting | `docs/prompts/weekly-summary-v1.md` |
| Monthly report drafting | `docs/prompts/monthly-summary-v1.md` |
| Anomaly classification | `docs/prompts/anomaly-classification-v1.md` |
| Insight generation | `docs/prompts/insight-generation-v1.md` |
| Risk prediction | `docs/prompts/risk-prediction-v1.md` |

Never overwrite a prompt file — create a new version.
Every ExtractedMetric and generated report stores the prompt version used.

---

## MVP Build Order

### Phase 1 — Foundation
1. User, Role, Department schema + seed
2. Daily entry form + submission
3. Core DB schema (all tables, nullable relations)

### Phase 2 — Intelligence
4. Metric extraction pipeline (Groq, hybrid deterministic + LLM)
5. Weekly report auto-generation
6. Basic approval workflow (DRAFT → APPROVED)

### Phase 3 — Reporting
7. Monthly report generation
8. Dashboard MVP (department, instructor, program, country views)

### Phase 4 — Interventions
9. Anomaly detection + Alert creation
10. Intervention tracking module

### Phase 5+ — Completed
11. Insight Engine v2 (predictive forecasting)
12. Insight Engine v3 (autonomous action planning)
13. Governance layer (board policies, audit)
14. Youth coding module (sessions, QR attendance, student feedback)
15. Impact dashboard (public, funding tracking)

---

## Testing

Tests use **Vitest** (configured at root `vitest.config.ts`).

| Service | Test Files |
|---------|-----------|
| anomaly-detection | 4 files: detectSpike, detectGap, detectInconsistency, severityRules |
| insight-engine | 13 files: aggregators, analyzers, correlation, v2 predictors, v3 planners, governance |

Run: `pnpm test` (all) or `pnpm --filter @orgos/<service> test` (per service).

---

## Shared UI Components

All reusable components live in `packages/ui/src/components/` and are exported
from `@orgos/ui`. Never re-implement in module code.

| Component | Purpose |
|-----------|---------|
| MetricCard | KPI display with trend arrow and delta |
| RiskCard | Alert display with severity-aware border styling |
| InsightCard | AI-generated insight with confidence indicator |
| InterventionCard | Action tracking with status transitions |
| StatusChip | Unified status badge for all entity states |
| DashboardGrid | Responsive Grid2 layout |
| TimelineSwitcher | Daily/Weekly/Monthly toggle |
| DataTable | MUI X DataGrid wrapper with pagination |
| InsightPanel | Collapsible AI analysis accordion |

Design system specification at `docs/design-system.md`.

---

## Architecture Decision Records

Full documentation at `docs/architecture/`:

| # | Decision | Status |
|---|----------|--------|
| 001 | Daily entries as source of truth | Accepted |
| 002 | All reports are system-generated | Accepted |
| 003 | Hybrid extraction strategy (deterministic + LLM) | Accepted |
| 004 | Approval workflow design with audit trail | Accepted |
| 005 | Hierarchical rollup engine (pre-computed snapshots) | Accepted |
| 006 | RBAC data scoping (3-layer enforcement) | Accepted |
| 007 | Prompt versioning (never overwrite, always version) | Accepted |
| 008 | Policy simulation engine (future phase) | Draft |
