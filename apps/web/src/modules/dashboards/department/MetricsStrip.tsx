"use client";
import * as React from "react";
import Grid from "@mui/material/Grid2";
import { Box, Button, Typography, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { MetricCard } from "@orgos/ui";
import type { ResolvedTrend } from "@orgos/shared-types";
import { DrillDownModal } from "../DrillDownModal";
import { TrendPredictor, type Prediction } from "./TrendPredictor";

interface Props {
  data: Record<string, unknown[]>;
  departmentId?: string;
  hubName?: string;
}

type MetricKey = "attendance_rate" | "dropout_count" | "engagement_score" | "output_count" | "blocker_present";

interface Predictions {
  [key: string]: Prediction | null;
}

function latestNumber(arr: unknown[]): number | null {
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function attendanceTrend(arr: unknown[]): ResolvedTrend | undefined {
  if (arr.length < 2) return undefined;
  const prev = arr.at(-2) as number;
  const curr = arr.at(-1) as number;
  if (typeof prev !== "number" || typeof curr !== "number") return undefined;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.01) return { direction: "neutral", impact: "positive" };
  return delta > 0
    ? { direction: "up", impact: "positive" }
    : { direction: "down", impact: "negative" };
}

function engagementTrend(level: string | undefined): ResolvedTrend | undefined {
  if (!level) return undefined;
  const l = level.toLowerCase();
  if (l === "high") return { direction: "up", impact: "positive" };
  if (l === "low") return { direction: "down", impact: "negative" };
  return { direction: "neutral", impact: "positive" };
}

const METRICS: MetricKey[] = ["attendance_rate", "engagement_score", "output_count", "dropout_count"];

export function MetricsStrip({ data, departmentId }: Props) {
  const [predictions, setPredictions] = React.useState<Predictions>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!departmentId) return;

    let mounted = true;
    setLoading(true);

    async function fetchPredictions() {
      const results: Predictions = {};

      await Promise.all(
        METRICS.map(async (metric) => {
          try {
            const from = new Date();
            from.setDate(from.getDate() - 14);
            const to = new Date();
            const url = `/api/metric-explorer?departmentIds[]=${departmentId}&metric=${metric}&from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}`;
            const res = await fetch(url);
            const json = await res.json();

            if (!mounted) return;

            const records = json.records || [];
            if (records.length < 3) {
              results[metric] = null;
              return;
            }

            const values = records
              .map((r: { metricValue: string | number | null }) => {
                const v = r.metricValue;
                if (metric === "engagement_score") {
                  if (typeof v === "number") return v;
                  if (typeof v === "string") {
                    const l = v.toLowerCase();
                    if (l === "high") return 2;
                    if (l === "medium") return 1;
                    if (l === "low") return 0;
                  }
                  return null;
                }
                return typeof v === "number" ? v : null;
              })
              .filter((v: number | null): v is number => v !== null);

            if (values.length < 3) {
              results[metric] = null;
              return;
            }

            const last7 = values.slice(-7);
            const n = last7.length;
            const xMean = (n - 1) / 2;
            const yMean = last7.reduce((s: number, v: number) => s + v, 0) / n;
            let num = 0;
            let den = 0;
            for (let i = 0; i < n; i++) {
              num += (i - xMean) * (last7[i] - yMean);
              den += (i - xMean) ** 2;
            }
            const slope = den !== 0 ? num / den : 0;
            const direction = metric === "attendance_rate" || metric === "engagement_score" || metric === "output_count"
              ? (slope > 0.01 ? "up" : slope < -0.01 ? "down" : "stable")
              : (slope > 0.1 ? "up" : slope < -0.1 ? "down" : "stable");

            const thresholds: Record<string, { threshold: number; compare: string; consecutive: number }> = {
              attendance_rate: { threshold: 0.8, compare: "lte", consecutive: 1 },
              dropout_count: { threshold: 2, compare: "gt", consecutive: 2 },
              engagement_score: { threshold: 0, compare: "eq", consecutive: 2 },
              output_count: { threshold: 3, compare: "lt", consecutive: 3 },
            };

            const cfg = thresholds[metric];
            if (!cfg) {
              results[metric] = null;
              return;
            }
            const current = values[values.length - 1];
            if (current === undefined) {
              results[metric] = null;
              return;
            }

            let isAtRisk = false;
            let daysToThreshold: number | null = null;

            if (direction === "down" || direction === "up") {
              if (metric === "attendance_rate") {
                const diff = current - cfg.threshold;
                daysToThreshold = diff <= 0 ? 0 : Math.ceil(diff / Math.abs(slope));
                isAtRisk = daysToThreshold <= 7;
              } else if (metric === "dropout_count") {
                const last2 = values.slice(-2);
                isAtRisk = last2.every((v: number) => v >= 2);
              } else if (metric === "engagement_score") {
                const last2 = values.slice(-2);
                isAtRisk = last2.every((v: number) => v === 0);
              } else if (metric === "output_count") {
                const last3 = values.slice(-3);
                isAtRisk = last3.every((v: number) => v < 3);
              }
            }

            if (!isAtRisk && direction !== "stable") {
              isAtRisk = daysToThreshold !== null && daysToThreshold <= 7;
            }

            if (direction !== "stable") {
              let severity: "info" | "warning" | "critical" = "info";
              if (isAtRisk) {
                if (daysToThreshold !== null && daysToThreshold <= 3) severity = "critical";
                else severity = "warning";
              }

              const currentStr = metric === "attendance_rate" ? `${Math.round(current * 100)}%` : String(Math.round(current * 10) / 10);
              const projected = slope * 7 + Math.max(0, current);
              const projectedStr = metric === "attendance_rate" ? `${Math.round(Math.max(0, projected) * 100)}%` : String(Math.round(Math.max(0, projected) * 10) / 10);

              results[metric] = {
                direction,
                confidence: 0.5,
                message: daysToThreshold !== null && daysToThreshold > 0
                  ? `${metric.replace(/_/g, " ")} trending down. ${currentStr} today, projected ${projectedStr} in ${daysToThreshold} days`
                  : `${metric.replace(/_/g, " ")} at risk`,
                severity,
                daysToThreshold,
                currentTrend: last7.map((v: number) => {
                  const min = Math.min(...last7);
                  const max = Math.max(...last7);
                  const range = max - min || 1;
                  return (v - min) / range;
                }),
              };
            } else {
              results[metric] = null;
            }
          } catch (e) {
            console.error("Prediction error for", metric, e);
            results[metric] = null;
          }
        })
      );

      if (mounted) {
        setPredictions(results);
        setLoading(false);
      }
    }

    fetchPredictions();

    const interval = setInterval(fetchPredictions, 30 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [departmentId]);

  const hasWarning = (metric: string) => {
    const p = predictions[metric];
    return p && (p.severity === "warning" || p.severity === "critical");
  };

  const getWarningTooltip = (metric: string) => {
    const p = predictions[metric];
    return p?.message || "";
  };
  const attendance = latestNumber(data.attendance_rate ?? []);
  const outputs = latestNumber(data.output_count ?? []);
  const dropouts = latestNumber(data.dropout_count ?? []);
  const engagementRaw = (data.engagement_score ?? []).at(-1) as string | undefined;
  const engagementStr = engagementRaw
    ? engagementRaw.charAt(0) + engagementRaw.slice(1).toLowerCase()
    : "—";
  const trend = attendanceTrend(data.attendance_rate ?? []);
  const hasDropouts = dropouts !== null && dropouts > 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <Box sx={{ position: "relative" }}>
          {hasWarning("attendance_rate") && (
            <Tooltip title={getWarningTooltip("attendance_rate")} arrow>
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  cursor: "pointer",
                  color: predictions["attendance_rate"]?.severity === "critical" ? "error.main" : "warning.main",
                }}
              >
                <Typography sx={{ fontSize: 18, lineHeight: 1 }}>⚠️</Typography>
              </Box>
            </Tooltip>
          )}
          <MetricCard
            label="Attendance Rate"
            value={attendance !== null ? `${Math.round(attendance * 100)}` : "—"}
            unit="%"
            period="vs yesterday"
            animationDelay={0}
            {...(trend ? { trend } : {})}
          />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <Box sx={{ position: "relative" }}>
          {hasWarning("engagement_score") && (
            <Tooltip title={getWarningTooltip("engagement_score")} arrow>
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  cursor: "pointer",
                  color: predictions["engagement_score"]?.severity === "critical" ? "error.main" : "warning.main",
                }}
              >
                <Typography sx={{ fontSize: 18, lineHeight: 1 }}>⚠️</Typography>
              </Box>
            </Tooltip>
          )}
          <MetricCard
            label="Engagement"
            value={engagementStr}
            period="today"
            animationDelay={60}
            {...(engagementTrend(engagementRaw) ? { trend: engagementTrend(engagementRaw)! } : {})}
          />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <Box sx={{ position: "relative" }}>
          {hasWarning("output_count") && (
            <Tooltip title={getWarningTooltip("output_count")} arrow>
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  cursor: "pointer",
                  color: predictions["output_count"]?.severity === "critical" ? "error.main" : "warning.main",
                }}
              >
                <Typography sx={{ fontSize: 18, lineHeight: 1 }}>⚠️</Typography>
              </Box>
            </Tooltip>
          )}
          <MetricCard
            label="Outputs Completed"
            value={outputs ?? "—"}
            period="today"
            animationDelay={120}
          />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <Box sx={{ position: "relative" }}>
          {hasWarning("dropout_count") && (
            <Tooltip title={getWarningTooltip("dropout_count")} arrow>
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  cursor: "pointer",
                  color: predictions["dropout_count"]?.severity === "critical" ? "error.main" : "warning.main",
                }}
              >
                <Typography sx={{ fontSize: 18, lineHeight: 1 }}>⚠️</Typography>
              </Box>
            </Tooltip>
          )}
          <MetricCard
            label="Dropout Flags"
            value={dropouts ?? 0}
            animationDelay={180}
            {...(hasDropouts ? { trend: { direction: "up" as const, impact: "negative" as const } } : {})}
          />
        </Box>
      </Grid>
    </Grid>
  );
}
