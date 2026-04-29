import type { InsightContext, InsightReport, InsightType } from "@orgos/shared-types";
import { aggregateEvents } from "./aggregators/eventAggregator.js";
import { aggregateAnomalies } from "./aggregators/anomalyAggregator.js";
import { aggregateMetricTrends } from "./aggregators/metricTrendAggregator.js";
import { detectPatterns } from "./analyzers/patternDetector.js";
import { detectCorrelations } from "./correlation/correlationEngine.js";
import { synthesizeRisks } from "./analyzers/riskSynthesizer.js";
import { generateRecommendations } from "./recommendations/recommendationEngine.js";
import { generateWeeklyNarrative, PROMPT_VERSION as WEEKLY_V } from "./narrative/weeklyNarrative.js";
import { generateMonthlyNarrative, PROMPT_VERSION as MONTHLY_V } from "./narrative/monthlyNarrative.js";
import { generateExecutiveNarrative, PROMPT_VERSION as EXEC_V } from "./narrative/executiveNarrative.js";

export async function runInsightEngine(
  context: InsightContext,
  type: InsightType
): Promise<InsightReport> {
  // Step 1 — Aggregate (structure only, no interpretation)
  aggregateEvents(context);                                          // validates + sorts timeline
  const groups  = aggregateAnomalies(context.anomalies);
  const trends  = aggregateMetricTrends(context);

  // Step 2 — Pattern detection
  const patterns = detectPatterns(groups, trends);

  // Step 3 — Correlation
  const correlations = detectCorrelations(context, groups, trends);

  // Step 4 — Risk synthesis
  const risks = synthesizeRisks(patterns, correlations, trends, groups);

  // Step 5 — Recommendations (deterministic)
  const recommendations = generateRecommendations(patterns, correlations, risks);

  // Step 6 — Confidence (deterministic)
  const confidence = computeConfidence(patterns, correlations);

  // Step 7 — Narrative (AI formats structured outputs, discovers nothing new)
  const { summary, promptVersion } = await generateSummary(type, context, patterns, correlations, risks, recommendations, trends);

  return {
    type,
    departmentId: context.departmentId,
    summary,
    insights: patterns,
    correlations,
    risks,
    recommendations,
    confidence,
    generatedAt: new Date(),
    promptVersion,
  };
}

async function generateSummary(
  type: InsightType,
  context: InsightContext,
  patterns: Awaited<ReturnType<typeof detectPatterns>>,
  correlations: Awaited<ReturnType<typeof detectCorrelations>>,
  risks: Awaited<ReturnType<typeof synthesizeRisks>>,
  recommendations: string[],
  trends: Awaited<ReturnType<typeof aggregateMetricTrends>>
): Promise<{ summary: string; promptVersion: string }> {
  const base = { departmentId: context.departmentId, patterns, correlations, risks, recommendations };

  if (type === "WEEKLY") {
    return { summary: await generateWeeklyNarrative(base), promptVersion: WEEKLY_V };
  }
  if (type === "MONTHLY") {
    return { summary: await generateMonthlyNarrative({ ...base, trends }), promptVersion: MONTHLY_V };
  }
  // EXECUTIVE — single-department entry formatted for org-level view
  return {
    summary: await generateExecutiveNarrative({
      departments: [{ departmentId: context.departmentId, risks, recommendations, confidence: computeConfidence(patterns, correlations) }],
    }),
    promptVersion: EXEC_V,
  };
}

function computeConfidence(
  patterns: InsightReport["insights"],
  correlations: InsightReport["correlations"]
): number {
  if (patterns.length === 0 && correlations.length === 0) return 0.5;
  const patternScore  = Math.min(patterns.length / 3, 1) * 0.4;
  const corrScore     = correlations.length > 0
    ? (correlations.reduce((s, c) => s + c.confidence, 0) / correlations.length) * 0.6
    : 0;
  return Math.min(patternScore + corrScore, 1);
}
