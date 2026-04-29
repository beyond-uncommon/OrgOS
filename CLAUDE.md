# CLAUDE.md

# Project: Uncommon OrgOS
**Organizational Operating System**

Staff submit lightweight daily operational inputs.
The system extracts metrics, detects anomalies, and automatically generates
all weekly, monthly, and organizational reports.

Users do NOT write reports. The system generates everything from daily inputs.

Claude should act as:
- Senior Full Stack Engineer
- Systems Architect
- Product-minded Technical Partner

Prioritize scalable architecture over quick hacks.

---

# What We Are Building

Not a reporting tool.
Not a dashboard system.
Not an analytics app.

**An Organizational Operating System (OrgOS)** that:
1. Captures raw daily operational data from staff (1–2 min/day)
2. Extracts structured metrics via AI
3. Detects inconsistencies, gaps, and anomalies
4. Auto-generates weekly, monthly, and org-level reports
5. Feeds live impact dashboards continuously
6. Triggers intervention workflows when issues are detected

---

# End-to-End Data Flow

```
Daily Inputs (All Staff)
        ↓
Metric Extraction Layer (Claude)
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
- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS

## Backend
- PostgreSQL
- Prisma ORM

## Architecture
- Monorepo
- Domain-driven service modules
- Feature-based frontend organization

## AI
Claude is used for:
- Metric extraction from daily narrative inputs
- Data standardization (text → structured metrics)
- Weekly and monthly report drafting
- Inconsistency and anomaly detection
- Insight generation over rolling data
- Risk flagging and trend reasoning

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
  ingestion-engine/         # Daily input handling
  metric-extraction/        # Claude-based metric extraction
  report-generator/         # Weekly + monthly auto-generation
  dashboard-engine/         # Live impact tracking
  intervention-engine/      # Alerts + action tracking
packages/
  ui/                       # Shared component library
  shared-types/             # Shared TypeScript types
  utils/                    # Shared utilities
docs/
  architecture/             # ADRs
  database-schema/          # Schema documentation
  prompts/                  # Versioned AI prompts
```

---

# Frontend Modules

```
apps/web/modules/
  auth/
  daily-inputs/
  report-generation/
  metrics/
  insights/
  dashboards/
  interventions/
  users/
  roles/
```

`report-generation` and `interventions` are first-class product modules.

---

# Core Database Model

| Table | Type | Notes |
|-------|------|-------|
| Users | Human | — |
| Roles | Human | RBAC |
| Departments | Human | Hierarchy |
| DailyEntries | **Human input** | Source of truth |
| ExtractedMetrics | System | AI-generated |
| WeeklyReports | System | Auto-generated |
| MonthlyReports | System | Auto-generated |
| Alerts | System | Anomalies + risks |
| Interventions | System+Human | Action tracking |
| DashboardSnapshots | System | Performance views |

**DailyEntries = only human input. Everything else = system-generated.**

---

# DailyEntry — Source of Truth

Each staff member submits once per day (~1–2 minutes):

```
DailyEntry
  - attendance_status
  - output_completed
  - blockers
  - engagement_notes
  - quick_summary (free text)
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

Claude extracts structured metrics from narrative daily inputs:

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

Extraction strategy: deterministic rules first, LLM second. Hybrid > pure AI.

---

# Intelligence Layer Rules

Metric extraction supports:
- Structured field extraction
- Narrative text extraction
- Inconsistency detection across entries
- Anomaly flagging (spikes, gaps, contradictions)
- Trend detection over rolling windows

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
  - issue_type
  - severity
  - assigned_owner
  - status
  - resolution_tracking
```

Interventions are a first-class module, not an alert sidebar.

---

# Organizational Rollup Rules

Hierarchy-aware aggregation:
```
Instructor Level
→ Department Level
→ Program Level
→ Organization Level
```

Each level receives:
- Filtered insights relevant to that scope
- Relevant KPIs
- Trend comparisons vs. prior periods

---

# Role Hierarchy

- Instructor
- Department Head
- Program Lead
- Program Manager
- Head of Operations
- Admin

Design RBAC-aware solutions. Data is scoped to the user's level — never flat.

---

# Coding Standards

Always:
- Use strict TypeScript
- Prefer server actions where appropriate
- Write composable functions
- Keep components small
- Add types first
- Use Zod validation at all system boundaries

Produce production-quality code. Not tutorials. Not pseudo-code.

---

# MVP Build Order

## Phase 1 — Foundation
1. Daily entry system
2. Role + department structure
3. Core database schema

## Phase 2 — Intelligence
4. Metric extraction (Claude)
5. Weekly report generation

## Phase 3 — Reporting
6. Monthly report generation
7. Dashboard MVP

## Phase 4 — Interventions
8. Alerts + anomaly detection
9. Intervention tracking

Do not build Phase N+1 features during Phase N work.

---

# Prompt Engineering Rules

Prompts are code. Store in `docs/prompts/`. Version by filename. Never overwrite.

---

# Dashboard Rules

Dashboards are views over shared intelligence data.
No siloed data sources. One data source, multiple views.
Metrics feed dashboards continuously — not on report submission.

---

# What To Optimize For

- Reliability
- Clarity
- Maintainability
- Auditability
- Scale

Not cleverness.

---

# Default Claude Behavior

When asked to build something:
1. Challenge architecture if needed
2. Suggest better structure if relevant
3. Identify risks
4. Then implement

Act like a thoughtful senior engineer, not a code generator.
