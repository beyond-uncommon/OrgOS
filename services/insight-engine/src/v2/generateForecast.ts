import type { InsightReport, InsightForecast, AnomalyResult } from "@orgos/shared-types";
import { log, logError } from "@orgos/utils";
import { ForecastEvents } from "./config/forecastEventTypes.js";
import { aggregateMetricTrends } from "../aggregators/metricTrendAggregator.js";
import { buildValueSeries, forecastTrends } from "./predictors/trendForecaster.js";
import { predictAnomalyRecurrence } from "./predictors/anomalyRecurrenceModel.js";
import { predictRiskEscalation } from "./predictors/riskEscalationPredictor.js";
import { synthesizeForwardRisks } from "./synthesizer/forwardRiskSynthesizer.js";
import { detectOpportunities } from "./synthesizer/opportunityDetector.js";
import { generatePreemptiveRecommendations } from "./synthesizer/preemptiveRecommendations.js";
import { generateForwardNarrative, PROMPT_VERSION } from "./narrative/forwardNarrative.js";

interface GenerateForecastInput {
  /** v1 InsightReport — treated as immutable truth by v2 */
  report: InsightReport;
  /** Full anomaly history for recurrence modeling (broader than the current window) */
  anomalyHistory: AnomalyResult[];
}

/**
 * The v2 prediction pipeline.
 * Never re-runs detection. Never queries the DB directly.
 * Consumes v1 InsightReport + anomaly history and produces InsightForecast.
 */
export async function generateForecast(input: GenerateForecastInput): Promise<InsightForecast> {
  const { report, anomalyHistory } = input;
  const runId = crypto.randomUUID();
  const run = Object.freeze({ runId, departmentId: report.departmentId, logVersion: 1 });

  log(ForecastEvents.STARTED, run);

  try {
    // Step 1 — Rebuild metric value series from the v1 context metrics
    // (report.insights carry evidence anomalies; the trend data lives in the v1 context)
    const evidenceMetrics = report.insights.flatMap((p) =>
      p.evidence.map((e) => ({
        metricKey: e.metricKey ?? "",
        metricValue: null as unknown,
        extractedAt: e.detectedAt,
      }))
    );
    const valueSeries = buildValueSeries(evidenceMetrics);

    // Step 2 — Trend forecasting (Holt exponential smoothing)
    const trendSummaries = aggregateMetricTrends({
      departmentId: report.departmentId,
      timeWindow: { from: new Date(0), to: new Date() },
      anomalies: anomalyHistory,
      alerts: [],
      metrics: evidenceMetrics,
    });
    const forecastedTrends = forecastTrends(trendSummaries, valueSeries);

    // Step 3 — Anomaly recurrence (Poisson model over decay-weighted history)
    const recurrenceRisks = predictAnomalyRecurrence(anomalyHistory, new Date());

    // Step 4 — Risk escalation paths
    const escalationForecasts = predictRiskEscalation(report.risks, forecastedTrends);

    // Step 5 — Synthesize into forward risk signals
    const forwardRisks = synthesizeForwardRisks(forecastedTrends, recurrenceRisks, escalationForecasts);

    // Step 6 — Opportunity detection
    const opportunities = detectOpportunities(forecastedTrends, trendSummaries);

    // Step 7 — Preemptive recommendations (deterministic)
    const preemptiveActions = generatePreemptiveRecommendations(forwardRisks, escalationForecasts, opportunities);

    // Step 8 — Confidence: weighted average of forecast confidences
    const confidence = computeForecastConfidence(forecastedTrends, recurrenceRisks);

    // Step 9 — Narrative (AI formats, does not compute)
    const summary = await generateForwardNarrative({
      departmentId: report.departmentId,
      forwardRisks,
      escalations: escalationForecasts,
      opportunities,
      recommendations: preemptiveActions,
    });

    log(ForecastEvents.COMPLETED, {
      ...run,
      forecastedTrendCount: forecastedTrends.length,
      forwardRiskCount: forwardRisks.length,
      opportunityCount: opportunities.length,
      confidence,
    });

    log(ForecastEvents.NARRATIVE_GENERATED, { ...run, promptVersion: PROMPT_VERSION });

    return {
      departmentId: report.departmentId,
      summary,
      forecastedTrends,
      recurrenceRisks,
      escalationForecasts,
      forwardRisks,
      opportunities,
      recommendedPreemptiveActions: preemptiveActions,
      confidence,
      generatedAt: new Date(),
      promptVersion: PROMPT_VERSION,
    };
  } catch (err) {
    logError(ForecastEvents.FAILED, err, run);
    throw err;
  }
}

function computeForecastConfidence(
  trends: ReturnType<typeof forecastTrends>,
  recurrences: ReturnType<typeof predictAnomalyRecurrence>
): number {
  const allConfidences = [
    ...trends.map((t) => t.confidence),
    ...recurrences.map((r) => Math.min(r.historicalFrequency / 5, 0.9)),
  ];
  if (allConfidences.length === 0) return 0.4;
  return allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;
}
