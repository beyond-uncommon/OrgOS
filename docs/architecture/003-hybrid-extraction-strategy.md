# ADR 003: Hybrid Extraction Strategy

**Status:** Accepted

## Context

Raw daily entries contain both structured fields (attendance status, output counts) and
narrative free text (engagement notes, quick summaries). A single extraction approach
cannot reliably handle both forms — deterministic rules fail on narrative text, and LLM
extraction is expensive and unreliable for simple structured mapping.

## Decision

Metric extraction uses a two-pass hybrid strategy:

1. **Deterministic pass (always runs first):** Map known structured fields from the
   DailyEntry model directly to ExtractedMetrics. This covers attendance_status,
   output_completed, and any pre-parsed numeric fields (dropouts, students_present, etc.).
2. **LLM pass (runs on remaining unmapped fields):** Extract metrics from narrative
   text fields (engagement_notes, blockers, quick_summary) using versioned prompts
   via the Groq SDK with the `mixtral-8x7b-32768` model.

Every ExtractedMetric stores its `source` (STRUCTURED vs NARRATIVE) and `confidence`.
Confidence is always 1.0 for deterministic extraction and 0–1 from LLM extraction.

## Consequences

- Reliable structured field extraction with zero false positives
- LLM costs limited to narrative-only text, reducing per-entry cost
- Confidence scoring allows downstream consumers to weight or filter metrics
- Prompts must be versioned independently for each extraction path
- LLM extraction cannot override deterministic results for the same metric key
