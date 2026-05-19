"use client";

import { Box, Paper, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Typography, Skeleton } from "@mui/material";
import { useState, useEffect } from "react";
import {
  HubComparisonChart,
  TrendLineChart,
  DonutChart,
  MetricHeatmap,
} from "@/modules/charts";

type Metric = "attendance_rate" | "dropout_count" | "engagement_score" | "output_count" | "blocker_present" | "risk_flag";
type Period = "7d" | "30d" | "90d";
type TabValue = "trends" | "comparison" | "breakdown" | "heatmap";

interface TrendsData { data: Array<{ date: string; value: number }>; metric: string }
interface ComparisonData { data: Array<{ id: string; name: string; value: number }>; metric: string }
interface BreakdownData { segments: Array<{ label: string; value: number; color: string }>; title: string }
interface HeatmapData {
  cells: Array<{ hubId: string; hubName: string; metricKey: string; value: number | null }>;
  hubIds: string[];
  hubNames: string[];
  metricKeys: string[];
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "attendance_rate", label: "Attendance Rate" },
  { value: "dropout_count", label: "Dropout Count" },
  { value: "engagement_score", label: "Engagement Score" },
  { value: "output_count", label: "Output Count" },
  { value: "blocker_present", label: "Blocker Present" },
  { value: "risk_flag", label: "Risk Flag" },
];

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

const CHART_TITLES: Record<TabValue, string> = {
  trends: "Metric Trends Over Time",
  comparison: "Hub Comparison",
  breakdown: "Metric Breakdown",
  heatmap: "Hub × Metric Heatmap",
};

export function ChartsPanel() {
  const [tab, setTab] = useState<TabValue>("trends");
  const [metric, setMetric] = useState<Metric>("attendance_rate");
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);

  async function fetchChartData(chartType: TabValue) {
    setLoading(true);
    try {
      const res = await fetch(`/api/charts/${chartType}?metric=${metric}&period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (chartType === "trends") setTrendsData(data);
      else if (chartType === "comparison") setComparisonData(data);
      else if (chartType === "breakdown") setBreakdownData(data);
      else if (chartType === "heatmap") setHeatmapData(data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChartData(tab);
    // also prefetch others
    fetchChartData("comparison");
    fetchChartData("breakdown");
    fetchChartData("heatmap");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, period]);

  useEffect(() => {
    fetchChartData(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const renderChart = () => {
    if (loading) {
      return (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
        </Box>
      );
    }

    switch (tab) {
      case "trends":
        if (!trendsData?.data?.length) return <EmptyState label="No trend data available" />;
        return (
          <TrendLineChart
            data={trendsData.data}
            metric={metric}
            title={`${METRIC_OPTIONS.find((m) => m.value === metric)?.label} — ${PERIOD_LABELS[period]}`}
          />
        );

      case "comparison":
        if (!comparisonData?.data?.length) return <EmptyState label="No comparison data available" />;
        return (
          <HubComparisonChart
            hubs={comparisonData.data.map((d) => ({
              id: d.id,
              name: d.name,
              metrics: { [metric]: [d.value] },
            }))}
            metric={metric}
            period={period}
          />
        );

      case "breakdown":
        if (!breakdownData?.segments?.length) return <EmptyState label="No breakdown data available" />;
        return <DonutChart segments={breakdownData.segments} title={breakdownData.title} />;

      case "heatmap":
        if (!heatmapData?.cells?.length) return <EmptyState label="No heatmap data available" />;
        return (
          <MetricHeatmap
            cells={heatmapData.cells}
            hubIds={heatmapData.hubIds}
            hubNames={heatmapData.hubNames}
            metricKeys={heatmapData.metricKeys}
          />
        );
    }
  };

  return (
    <Paper
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2, pt: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", pb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="metric-select-label">Metric</InputLabel>
            <Select
              labelId="metric-select-label"
              value={metric}
              label="Metric"
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              {METRIC_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="period-select-label">Period</InputLabel>
            <Select
              labelId="period-select-label"
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as TabValue)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: 13 },
          }}
        >
          <Tab value="trends" label="Trends" />
          <Tab value="comparison" label="Hub Comparison" />
          <Tab value="breakdown" label="Breakdown" />
          <Tab value="heatmap" label="Heatmap" />
        </Tabs>
      </Box>
      <Box sx={{ p: 2 }}>{renderChart()}</Box>
    </Paper>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Box
      sx={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
}