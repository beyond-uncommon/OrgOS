import type { DailyEntry } from "@orgos/shared-types";
import type { MetricsOutput } from "./schema.js";

// Deterministic extraction from structured fields — runs before LLM
export function structuredExtraction(entry: DailyEntry): Partial<MetricsOutput> {
  const metrics: Partial<MetricsOutput> = {};

  // Presence of blockers text implies blocker_present
  if (entry.blockers && entry.blockers.trim().length > 0) {
    metrics.blocker_present = true;
  }

  // Count completed outputs if numeric pattern present
  const outputMatch = entry.outputCompleted.match(/\b(\d+)\b/);
  if (outputMatch?.[1]) {
    metrics.output_count = parseInt(outputMatch[1], 10);
  }

  return metrics;
}
