import type { InsightPattern, InsightCorrelation, RiskSignal } from "@orgos/shared-types";

/**
 * Deterministic only — every recommendation maps from a known RiskSignal or Pattern.
 * No LLM. Every output must be explainable by its input condition.
 */
export function generateRecommendations(
  patterns: InsightPattern[],
  correlations: InsightCorrelation[],
  risks: RiskSignal[]
): string[] {
  const recs: string[] = [];

  // Systemic signal — highest priority
  const isCritical = risks.some((r) => r.severity === "CRITICAL");
  const isSystemic = correlations.some((c) => c.confidence >= 0.85);
  if (isCritical || isSystemic) {
    recs.push("Initiate an immediate engagement intervention — multiple converging risk signals detected across this department");
  }

  // Missing entries
  const missingPattern = patterns.find((p) => p.type === "BEHAVIOR_SHIFT");
  if (missingPattern) {
    const uniqueUsers = new Set(missingPattern.evidence.map((e) => e.userId).filter(Boolean));
    const repeatUsers = [...uniqueUsers].filter(
      (uid) => missingPattern.evidence.filter((e) => e.userId === uid).length > 1
    );
    if (repeatUsers.length > 0) {
      recs.push(`Follow up directly with ${repeatUsers.length} staff member(s) who missed submissions on multiple days`);
    } else {
      recs.push("Audit reporting compliance for this department — missing entries may indicate workflow barriers");
    }
  }

  // Data quality
  const dataRisk = risks.find((r) => r.category === "DATA_QUALITY");
  if (dataRisk) {
    recs.push("Review recent daily entries for accuracy — cross-field inconsistencies suggest staff may need re-training on input expectations");
  }

  // Engagement
  const engagementRisk = risks.find(
    (r) => r.category === "ENGAGEMENT" && (r.severity === "HIGH" || r.severity === "CRITICAL")
  );
  if (engagementRisk) {
    recs.push("Schedule a department-level check-in — sustained low engagement often precedes dropout and attendance decline");
  }

  // Dropout
  const dropoutPattern = patterns.find(
    (p) => p.type === "TREND" && p.evidence.some((e) => e.metricKey === "dropout_count")
  );
  if (dropoutPattern) {
    recs.push("Investigate root cause of recurring dropout spikes — consider whether cohort structure or instructor support needs adjustment");
  }

  // Performance
  const perfRisk = risks.find((r) => r.category === "PERFORMANCE" && r.severity !== "LOW");
  if (perfRisk) {
    recs.push("Review output targets and workload distribution — productivity decline may indicate structural capacity issues");
  }

  return [...new Set(recs)]; // deduplicate when multiple rules fire
}
