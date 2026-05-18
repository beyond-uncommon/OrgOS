# ADR 007: Prompt Versioning

**Status:** Accepted

## Context

AI-generated content in the system (metric extraction, report drafting, insight
generation) depends on LLM prompts. Prompts change over time as extraction accuracy
improves, report formats evolve, or new insight types are added. Without versioning,
there is no way to:
- Audit which prompt produced a given output
- Roll back to a previous prompt version if quality regresses
- Compare output quality across prompt versions
- Reproduce results from a specific point in time

## Decision

### Prompt Storage
- Prompts are stored as markdown files in `docs/prompts/`.
- Every prompt file has a version suffix: `extraction-v1.md`, `weekly-summary-v2.md`.
- Prompts are never overwritten. A new version creates a new file.
- `docs/prompts/CHANGELOG.md` tracks the version history with dates, changes, and rationale.

### Version Tracking
- Every `ExtractedMetric` record stores the `promptVersion` that generated it.
- Every `WeeklyReport` and `MonthlyReport` stores the `promptVersion` used for drafting.
- The system always uses the latest prompt version for new generations.
- Historical records retain their original prompt version for auditability.

### Version Selection
The prompt registry (defined in service configuration) maps use cases to active
prompt files. When a new prompt version is added:
1. The new file is created (e.g., `extraction-v2.md`).
2. The CHANGELOG is updated.
3. The registry pointer is updated to the new version.
4. Old data retains its version tag — no backfill.

### Testing
Each prompt version should have associated test cases that validate output format.
Tests are stored alongside prompt files where applicable.

## Consequences
- Full audit trail linking AI output to the prompt that produced it
- Safe to iterate on prompts without fear of breaking historical data
- Rollback is a single config change (update registry pointer)
- Requires discipline — always version-bump, never edit in place
- Prompt test cases needed to validate new versions before deployment
