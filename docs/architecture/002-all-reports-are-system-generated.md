# ADR 002: All Reports Are System-Generated

**Status:** Accepted

## Context
Manual report authoring creates duplication, inconsistency, and fake reporting risk.

## Decision
WeeklyReports and MonthlyReports are generated outputs, not manual submissions.
The system drafts them; managers review, optionally edit, and approve.
originalContent is preserved on every report record. Edits go in editLog.

## Consequences
- Single source of truth for all reporting data
- Managers shift from authoring to reviewing — faster, less error-prone
- Approval workflow required before reports propagate upward
- Requires LLM summarization with versioned prompts
