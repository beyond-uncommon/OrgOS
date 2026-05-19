"use client";

import { Box, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

interface HubData {
  id: string;
  name: string;
  metrics: Record<string, number[]>;
}

interface Props {
  hubs: HubData[];
  metric: string;
  period: string;
}

const METRIC_LABELS: Record<string, string> = {
  attendance_rate: "Attendance Rate (%)",
  dropout_count: "Dropouts",
  engagement_score: "Engagement",
  output_count: "Outputs",
  blocker_present: "Blockers",
  risk_flag: "Risk Flags",
};

const METRIC_KEYS: Record<string, string> = {
  attendance_rate: "attendance_rate",
  dropout_count: "dropout_count",
  engagement_score: "engagement_score",
  output_count: "output_count",
  blocker_present: "blocker_present",
  risk_flag: "risk_flag",
};

function aggregateMetric(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

function getBarColor(metric: string, value: number, theme: { palette: { success: { main: string }; warning: { main: string }; error: { main: string }; primary: { main: string } } }): string {
  switch (metric) {
    case "attendance_rate":
      if (value >= 80) return theme.palette.success.main;
      if (value >= 60) return theme.palette.warning.main;
      return theme.palette.error.main;
    case "engagement_score":
      if (value >= 2) return theme.palette.success.main;
      if (value >= 1) return theme.palette.warning.main;
      return theme.palette.error.main;
    case "dropout_count":
    case "blocker_present":
    case "risk_flag":
      if (value === 0) return theme.palette.success.main;
      if (value <= 2) return theme.palette.warning.main;
      return theme.palette.error.main;
    case "output_count":
      if (value >= 5) return theme.palette.success.main;
      if (value >= 2) return theme.palette.warning.main;
      return theme.palette.error.main;
    default:
      return theme.palette.primary.main;
  }
}

export function HubComparisonChart({ hubs, metric }: Props) {
  const theme = useTheme();
  const metricKey = METRIC_KEYS[metric] ?? metric;
  const label = METRIC_LABELS[metric] ?? metric;

  const chartData = hubs.map((hub) => ({
    hub: hub.name,
    value: aggregateMetric(hub.metrics[metricKey] ?? []),
  }));

  const values = chartData.map((d) => d.value);

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {label} by Hub
      </Typography>
      <Box sx={{ width: "100%", height: 260 }}>
        <BarChart
          dataset={chartData}
          xAxis={[{ scaleType: "band", dataKey: "hub", tickLabelStyle: { fontSize: 11 } }]}
          yAxis={[{ tickLabelStyle: { fontSize: 11 } }]}
          series={[{ dataKey: "value", label, color: getBarColor(metric, values[0] ?? 0, theme) }]}
          margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
          height={260}
        />
      </Box>
    </Box>
  );
}