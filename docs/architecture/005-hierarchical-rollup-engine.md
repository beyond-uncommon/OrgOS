# ADR 005: Hierarchical Rollup Engine

**Status:** Accepted

## Context

The organization has a multi-level hierarchy: Instructor → Department/Hub → Program →
Organization. Reports and metrics must flow upward through this hierarchy, with each
level receiving appropriately aggregated data. Without a structured rollup engine,
each level would need to compute its own aggregates from raw data, leading to
inconsistency and performance degradation.

## Decision

Rollups follow a strict bottom-up aggregation model:

```
DailyEntries (per staff member)
  → WeeklyReports (per department)
    → MonthlyReports (per department)
      → DashboardSnapshot: DEPARTMENT
        → DashboardSnapshot: PROGRAM
          → DashboardSnapshot: ORGANIZATION
```

### Rules
1. Each level aggregates strictly from the level below — never from raw data.
2. A rollup cannot generate until all contributing records are APPROVED/PUBLISHED.
3. Each rollup stores its own pre-computed metrics — never recomputed at read time.
4. Rollup generation is triggered by approval events (not scheduled).
5. Snapshots are additive — a parent snapshot aggregates child snapshots, not raw entries.

### Pre-computation
Rather than querying raw data on every page load, the dashboard engine pre-computes
`DashboardSnapshot` records. Each snapshot contains the full set of metrics relevant
to that scope/period combination. The UI reads from the latest snapshot.

### Department Hierarchy
The Department model supports self-referencing via `parentDepartmentId`, enabling
an arbitrary-depth tree. The rollup engine traverses this tree recursively,
aggregating leaf nodes into parent nodes.

## Consequences
- Fast reads at every level (pre-computed snapshots)
- Consistency — no level can produce numbers that contradict its children
- Snapshot invalidation must cascade when data at any child level changes
- Pre-computation means write amplification — one entry update can invalidate N snapshots
- Department tree depth is bounded by organizational structure (typically 3-4 levels)
