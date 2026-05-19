"use client";

import { Box, Typography, useTheme } from "@mui/material";

type MetricValue = number | null;

interface CellData {
  hubId: string;
  hubName: string;
  metricKey: string;
  value: MetricValue;
}

interface Props {
  cells: CellData[];
  hubIds: string[];
  hubNames: string[];
  metricKeys: string[];
}

const METRIC_LABELS: Record<string, string> = {
  attendance_rate: "Attendance",
  dropout_count: "Dropouts",
  engagement_score: "Engagement",
  output_count: "Outputs",
  blocker_present: "Blockers",
  risk_flag: "Risk",
};

function valueToColor(value: MetricValue, metric: string, theme: { palette: { success: { main: string }, warning: { main: string }, error: { main: string }, grey: { 200: string, 800: string } } }): string {
  if (value === null) return theme.palette.grey[200];
  if (metric === "attendance_rate") {
    if (value >= 80) return theme.palette.success.main;
    if (value >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  }
  if (metric === "engagement_score") {
    if (value >= 2) return theme.palette.success.main;
    if (value >= 1) return theme.palette.warning.main;
    return theme.palette.error.main;
  }
  if (["dropout_count", "blocker_present", "risk_flag"].includes(metric)) {
    if (value === 0) return theme.palette.success.main;
    if (value <= 2) return theme.palette.warning.main;
    return theme.palette.error.main;
  }
  if (metric === "output_count") {
    if (value >= 5) return theme.palette.success.main;
    if (value >= 2) return theme.palette.warning.main;
    return theme.palette.error.main;
  }
  return theme.palette.grey[200];
}

function valueToOpacity(value: MetricValue): number {
  if (value === null) return 0;
  return Math.min(1, 0.3 + (Math.min(value, 10) / 10) * 0.7);
}

export function MetricHeatmap({ cells, hubIds, hubNames, metricKeys }: Props) {
  const theme = useTheme();

  const getCell = (hubId: string, metricKey: string): MetricValue => {
    const cell = cells.find((c) => c.hubId === hubId && c.metricKey === metricKey);
    return cell?.value ?? null;
  };

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflowX: "auto",
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Hub × Metric Heatmap
      </Typography>
      <Box sx={{ minWidth: 500 }}>
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: 120, flexShrink: 0 }} />
          {metricKeys.map((mk) => (
            <Box
              key={mk}
              sx={{
                width: 80,
                flexShrink: 0,
                textAlign: "center",
                mb: 1,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10 }}>
                {METRIC_LABELS[mk] ?? mk}
              </Typography>
            </Box>
          ))}
        </Box>
        {hubIds.map((hubId, hi) => {
          const cellValues = metricKeys.map((mk) => getCell(hubId, mk));
          const allNull = cellValues.every((v) => v === null);
          if (allNull) return null;
          return (
            <Box key={hubId} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <Box
                sx={{
                  width: 120,
                  flexShrink: 0,
                  pr: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 11 }}>
                  {hubNames[hi]}
                </Typography>
              </Box>
              {metricKeys.map((mk) => {
                const val = getCell(hubId, mk);
                const color = valueToColor(val, mk, theme);
                const opacity = valueToOpacity(val);
                return (
                  <Box
                    key={mk}
                    sx={{
                      width: 80,
                      height: 36,
                      flexShrink: 0,
                      mx: 0.25,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: color,
                      opacity,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {val !== null && (
                      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: "white" }}>
                        {typeof val === "number" ? val.toFixed(1) : String(val)}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
        {[
          { label: "Low/None", color: theme.palette.grey[200] },
          { label: "Mid", color: theme.palette.warning.main },
          { label: "High", color: theme.palette.success.main },
        ].map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: item.color }} />
            <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}