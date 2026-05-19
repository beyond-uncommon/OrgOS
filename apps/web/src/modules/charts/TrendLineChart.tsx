"use client";

import { Box, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

interface DataPoint {
  date: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  metric: string;
  title: string;
}

const METRIC_LABELS: Record<string, string> = {
  attendance_rate: "Attendance (%)",
  dropout_count: "Dropouts",
  engagement_score: "Engagement Score",
  output_count: "Outputs",
  blocker_present: "Blockers",
  risk_flag: "Risk Flags",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendLineChart({ data, metric, title }: Props) {
  const theme = useTheme();
  const label = METRIC_LABELS[metric] ?? metric;

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    [label]: d.value,
  }));

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
        {title}
      </Typography>
      <Box sx={{ width: "100%", height: 260 }}>
        <LineChart
          dataset={chartData}
          xAxis={[{ dataKey: "date", tickLabelStyle: { fontSize: 11 } }]}
          yAxis={[{ tickLabelStyle: { fontSize: 11 } }]}
          series={[{ dataKey: label, label, showMark: false, color: theme.palette.primary.main }]}
          margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
          height={260}
        />
      </Box>
    </Box>
  );
}