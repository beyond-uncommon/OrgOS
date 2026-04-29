# ADR 001: Daily Entries as Source of Truth

**Status:** Accepted

## Context
Previous design had staff submitting weekly reports from memory. This creates recall bias,
inconsistent data quality, and friction that reduces submission rates.

## Decision
DailyEntry is the only human-authored entity in the system.
All other report entities (WeeklyReport, MonthlyReport) are system-generated outputs.

## Consequences
- Higher data fidelity (same-day capture vs. weekly reconstruction)
- Lower friction for staff (1–2 min/day vs. extended weekly effort)
- Requires extraction pipeline to structure narrative input
- Requires approval workflow for generated reports
