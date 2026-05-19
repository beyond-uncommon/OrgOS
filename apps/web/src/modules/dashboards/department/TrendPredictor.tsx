"use client";

import * as React from "react";
import { Box, Typography, Tooltip, Chip } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

interface Props {
  departmentId: string;
  metric: "attendance_rate" | "dropout_count" | "engagement_score" | "output_count" | "blocker_present";
}

export interface Prediction {
  direction: "up" | "down" | "stable";
  confidence: number;
  message: string;
  severity: "info" | "warning" | "critical";
  daysToThreshold: number | null;
  currentTrend: number[];
}

interface ThresholdConfig {
  threshold: number;
  compare: "lt" | "lte" | "gt" | "gte" | "eq";
  consecutiveDays?: number;
  windowSize?: number;
}

const METRIC_THRESHOLDS: Record<string, ThresholdConfig> = {
  attendance_rate: { threshold: 0.8, compare: "lte" },
  dropout_count: { threshold: 2, compare: "gt", consecutiveDays: 2 },
  engagement_score: { threshold: 0, compare: "eq", consecutiveDays: 2, windowSize: 2 },
  output_count: { threshold: 3, compare: "lt", consecutiveDays: 3 },
  blocker_present: { threshold: 1, compare: "gte", consecutiveDays: 2 },
};

function calculateDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().split("T")[0] ?? "";
  const toStr = to.toISOString().split("T")[0] ?? "";
  return {
    from: fromStr,
    to: toStr,
  };
}

function linearRegression(values: number[]): { slope: number; r2: number; intercept: number } {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, r2: 0, intercept: values[0] || 0 };
  }

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    if (y === undefined) continue;
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v === undefined) continue;
    const predicted = slope * i + intercept;
    ssRes += (v - predicted) ** 2;
    ssTot += (v - yMean) ** 2;
  }

  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, r2: Math.max(0, r2), intercept };
}

function calculateConsecutiveDays(values: number[], config: ThresholdConfig): number {
  if (!config.consecutiveDays) return 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  const isThresholdBreached = (v: number): boolean => {
    switch (config.compare) {
      case "lt": return v < config.threshold;
      case "lte": return v <= config.threshold;
      case "gt": return v > config.threshold;
      case "gte": return v >= config.threshold;
      case "eq": return v === config.threshold;
      default: return false;
    }
  };
  for (const v of values.slice(-((config.consecutiveDays || 0) + (config.windowSize || 0)))) {
    if (isThresholdBreached(v)) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  return maxConsecutive;
}

function calculateDaysToThreshold(
  currentValue: number,
  slope: number,
  threshold: number,
  compare: string
): number | null {
  if (slope === 0) return null;
  if ((compare === "lt" || compare === "lte") && slope >= 0) return null;
  if ((compare === "gt" || compare === "gte") && slope <= 0) return null;

  const diff = compare.includes("l") || compare.includes("e")
    ? currentValue - threshold
    : threshold - currentValue;

  if ((compare === "lt" || compare === "lte") && diff <= 0) return 0;
  if ((compare === "gt" || compare === "gte") && diff <= 0) return 0;

  const days = diff / slope;
  return Math.max(0, Math.ceil(days));
}

function parseEngagementValue(value: string | number): number {
  if (typeof value === "number") return value;
  const v = value.toLowerCase();
  if (v === "high") return 2;
  if (v === "medium") return 1;
  if (v === "low") return 0;
  return 1;
}

function transformMetricValue(metric: string, value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (metric === "engagement_score") return parseEngagementValue(value);
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function TrendPredictor({ departmentId, metric }: Props): React.ReactNode {
  const [prediction, setPrediction] = React.useState<Prediction | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function fetchAndAnalyze() {
      try {
        const { from, to } = calculateDateRange(14);
        const url = `/api/metric-explorer?departmentIds[]=${departmentId}&metric=${metric}&from=${from}&to=${to}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!mounted) return;

        const records = json.records || [];
        if (records.length === 0) {
          setPrediction(null);
          setLoading(false);
          return;
        }

        const rawValues = records.map((r: { metricValue: string | number | null }) => r.metricValue);
        const values = rawValues.map((v: string | number | null) => transformMetricValue(metric, v)).filter((v: number | null): v is number => v !== null);

        if (values.length < 3) {
          setPrediction(null);
          setLoading(false);
          return;
        }

        const last7 = values.slice(-7);
        const { slope, r2, intercept } = linearRegression(last7);

        const config = METRIC_THRESHOLDS[metric];
        if (!config) {
          setPrediction(null);
          setLoading(false);
          return;
        }
        const currentValue = values[values.length - 1];
        if (currentValue === undefined) {
          setPrediction(null);
          setLoading(false);
          return;
        }

        let direction: "up" | "down" | "stable";
        if (metric === "attendance_rate" || metric === "engagement_score" || metric === "output_count") {
          direction = slope > 0.01 ? "up" : slope < -0.01 ? "down" : "stable";
        } else {
          direction = slope > 0.1 ? "up" : slope < -0.1 ? "down" : "stable";
        }

        const consecutiveBreach = calculateConsecutiveDays(values, config);

        let daysToThreshold: number | null = null;
        if (direction !== "stable") {
          daysToThreshold = calculateDaysToThreshold(currentValue, slope, config.threshold, config.compare);
        }

        let severity: "info" | "warning" | "critical" = "info";
        if (direction === "stable") {
          severity = "info";
        } else if (daysToThreshold !== null) {
          if (daysToThreshold <= 3) severity = "critical";
          else if (daysToThreshold <= 7) severity = "warning";
          else severity = "info";
        } else if (consecutiveBreach >= (config.consecutiveDays || 0)) {
          severity = "critical";
        }

        if (direction === "stable" && r2 > 0.7) {
          setPrediction(null);
          setLoading(false);
          return;
        }

        let message = "";
        const currentStr = metric === "attendance_rate"
          ? `${Math.round(currentValue * 100)}%`
          : String(Math.round(currentValue * 10) / 10);

        if (direction === "down") {
          const projectedValue = slope * 7 + intercept;
          const projectedStr = metric === "attendance_rate"
            ? `${Math.round(Math.max(0, projectedValue) * 100)}%`
            : String(Math.round(Math.max(0, projectedValue) * 10) / 10);

          if (daysToThreshold !== null && daysToThreshold > 0) {
            message = `${metric.replace(/_/g, " ")} trending down. ${currentStr} today, projected ${projectedStr} in ${daysToThreshold} days`;
          } else if (consecutiveBreach >= (config.consecutiveDays || 0)) {
            message = `${metric.replace(/_/g, " ")} has been below threshold for ${consecutiveBreach} consecutive days`;
          } else {
            message = `${metric.replace(/_/g, " ")} trending down`;
          }
        } else if (direction === "up") {
          message = `${metric.replace(/_/g, " ")} trending up`;
        } else {
          message = `${metric.replace(/_/g, " ")} stable`;
        }

        const sparkline = last7.map((v: number) => {
          const min = Math.min(...last7);
          const max = Math.max(...last7);
          const range = max - min || 1;
          return (v - min) / range;
        });

        setPrediction({
          direction,
          confidence: r2,
          message,
          severity,
          daysToThreshold,
          currentTrend: sparkline,
        });
      } catch (e) {
        console.error("TrendPredictor error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAndAnalyze();

    const interval = setInterval(fetchAndAnalyze, 30 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [departmentId, metric]);

  if (loading || !prediction) {
    return null;
  }

  if (prediction.severity === "info" && prediction.direction === "stable") {
    return null;
  }

  const getColor = () => {
    if (prediction.severity === "critical") return "error";
    if (prediction.severity === "warning") return "warning";
    return "info";
  };

  const color = getColor();

  const showWarningIcon = prediction.severity === "warning" || prediction.severity === "critical";
  const showTrendingUp = prediction.direction === "up" && !showWarningIcon;
  const showTrendingDown = prediction.direction === "down" && !showWarningIcon;

  return (
    <Tooltip title={prediction.message} arrow placement="top">
      <Chip
        size="small"
        {...(showWarningIcon && { icon: <WarningAmberIcon sx={{ fontSize: 16 }} /> })}
        {...(showTrendingUp && { icon: <TrendingUpIcon sx={{ fontSize: 16 }} /> })}
        {...(showTrendingDown && { icon: <TrendingDownIcon sx={{ fontSize: 16 }} /> })}
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
              {metric.replace(/_/g, " ")}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.25 }}>
              {prediction.currentTrend.slice(0, 7).map((v, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 3,
                    height: 8,
                    bgcolor: color === "error"
                      ? "error.main"
                      : color === "warning"
                        ? "warning.main"
                        : "primary.main",
                    opacity: 0.4 + v * 0.6,
                    borderRadius: 0.25,
                  }}
                />
              ))}
            </Box>
          </Box>
        }
        variant="outlined"
        color={color}
        sx={{
          height: 24,
          borderRadius: 1,
          animation: prediction.severity === "critical" ? "pulse-chip 1.8s ease-in-out infinite" : "none",
          "& @keyframes pulse-chip": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.7 },
          },
        }}
      />
    </Tooltip>
  );
}