import type { RiskSignal, RiskEscalationForecast, ForecastHorizon } from "@orgos/shared-types";
import type { ForecastedTrend } from "@orgos/shared-types";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITY_ORDER: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function escalate(current: Severity, steps = 1): Severity {
  const idx = Math.min(SEVERITY_ORDER.indexOf(current) + steps, SEVERITY_ORDER.length - 1);
  return SEVERITY_ORDER[idx];
}

/**
 * For each current RiskSignal, checks whether correlated metric trends point
 * toward escalation. Rules are explicit and deterministic — no AI.
 *
 * Pure function — no DB access.
 */
export function predictRiskEscalation(
  risks: RiskSignal[],
  trends: ForecastedTrend[]
): RiskEscalationForecast[] {
  const forecasts: RiskEscalationForecast[] = [];

  const trendMap = new Map(trends.map((t) => [t.metricKey, t]));

  for (const risk of risks) {
    if (risk.severity === "CRITICAL") continue; // already at max — no escalation path

    const result = evaluateEscalation(risk, trendMap);
    if (result) forecasts.push(result);
  }

  return forecasts;
}

function evaluateEscalation(
  risk: RiskSignal,
  trendMap: Map<string, ForecastedTrend>
): RiskEscalationForecast | null {
  const triggers: string[] = [];
  let steps = 0;
  let horizon: ForecastHorizon = "30D";

  if (risk.category === "ENGAGEMENT") {
    const attendance = trendMap.get("attendance_rate");
    const engagement = trendMap.get("engagement_score");
    if (attendance?.direction === "DOWN") {
      triggers.push("attendance_rate is projected to continue declining");
      steps = 1;
      horizon = attendance.confidence > 0.7 ? "14D" : "30D";
    }
    if (engagement?.direction === "DOWN") {
      triggers.push("engagement_score is projected to decline further");
      steps = Math.max(steps, 1);
      horizon = "14D";
    }
  }

  if (risk.category === "OPERATIONAL") {
    const dropout = trendMap.get("dropout_count");
    if (dropout?.direction === "UP") {
      triggers.push("dropout_count is projected to increase");
      steps = 1;
      horizon = dropout.confidence > 0.75 ? "7D" : "14D";
    }
  }

  if (risk.category === "PERFORMANCE") {
    const output = trendMap.get("output_count");
    if (output?.direction === "DOWN") {
      triggers.push("output_count is projected to decline further");
      steps = 1;
      horizon = "14D";
    }
  }

  if (risk.category === "DATA_QUALITY") {
    // Data quality doesn't escalate from trends — it's driven by behavioral patterns
    return null;
  }

  if (triggers.length === 0) return null;

  const projectedSeverity = escalate(risk.severity, steps);
  if (projectedSeverity === risk.severity) return null; // no escalation predicted

  const avgConfidence =
    triggers.length > 0
      ? triggers.reduce((_, t) => {
          const key = t.includes("attendance") ? "attendance_rate"
            : t.includes("engagement") ? "engagement_score"
            : t.includes("dropout") ? "dropout_count"
            : "output_count";
          return (trendMap.get(key)?.confidence ?? 0.5);
        }, 0) / triggers.length
      : 0.5;

  return {
    riskCategory: risk.category,
    currentSeverity: risk.severity,
    projectedSeverity,
    horizon,
    triggerConditions: triggers,
    confidence: Math.min(avgConfidence * 0.9, 0.85), // cap at 0.85 — predictions are never certain
  };
}
