import type { InsightContext } from "@orgos/shared-types";

export interface EventGroup {
  departmentId: string;
  timeWindow: { from: Date; to: Date };
  /** Alerts sorted ascending by createdAt — the temporal event stream for this context */
  timeline: InsightContext["alerts"];
  /** Count by alert type for quick frequency checks */
  typeFrequency: Record<string, number>;
  /** Count by severity */
  severityFrequency: Record<string, number>;
}

/**
 * Structures the alert stream in a context into a queryable event group.
 * Pure function — no DB access, no interpretation.
 */
export function aggregateEvents(context: InsightContext): EventGroup {
  const sorted = [...context.alerts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const typeFrequency: Record<string, number> = {};
  const severityFrequency: Record<string, number> = {};

  for (const alert of sorted) {
    typeFrequency[alert.type] = (typeFrequency[alert.type] ?? 0) + 1;
    severityFrequency[alert.severity] = (severityFrequency[alert.severity] ?? 0) + 1;
  }

  return {
    departmentId: context.departmentId,
    timeWindow: context.timeWindow,
    timeline: sorted,
    typeFrequency,
    severityFrequency,
  };
}
