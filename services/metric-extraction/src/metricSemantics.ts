import type { MetricKey, ResolvedTrend } from "@orgos/shared-types";
import { metricRuleRegistry } from "./metricRules/index.js";

/**
 * The single mandatory entry point for all trend resolution.
 *
 * ALL callers — including AI-generated output — must pass through here.
 * No component, pipeline step, or AI model may produce a ResolvedTrend directly.
 *
 * - directional metrics: direction drives impact
 * - inverse metrics: direction drives impact with inverted semantics
 * - stateful metrics: value drives both direction and impact; direction arg is ignored
 */
export function resolveTrendImpact(
  metricKey: MetricKey,
  direction: "up" | "down" | "neutral",
  value?: unknown
): ResolvedTrend {
  const rule = metricRuleRegistry[metricKey];

  if (rule.type === "stateful" && value === undefined) {
    throw new Error(
      `Metric "${metricKey}" is stateful — a current value must be provided to resolveTrendImpact.`
    );
  }

  return rule.evaluate(direction, value);
}

/**
 * Validates and re-resolves a trend that originated from an AI source.
 *
 * Accepts the AI's direction but always re-derives impact from the rules engine.
 * For stateful metrics, the current value overrides the AI's direction entirely.
 */
export function validateAITrend(
  metricKey: MetricKey,
  aiTrend: { direction: "up" | "down" | "neutral" },
  value?: unknown
): ResolvedTrend {
  return resolveTrendImpact(metricKey, aiTrend.direction, value);
}
