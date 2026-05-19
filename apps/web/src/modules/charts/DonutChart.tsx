"use client";

import { Box, Typography } from "@mui/material";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  title: string;
}

function getTotal(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.value, 0);
}

export function DonutChart({ segments, title }: Props) {
  const total = getTotal(segments);

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
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ width: 160, height: 160 }}>
          <PieChart
            series={[
              {
                data: segments.map((s) => ({ id: s.label, value: s.value, label: s.label })),
                innerRadius: 50,
                outerRadius: 75,
              },
            ]}
            colors={segments.map((s) => s.color)}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                fill: "white",
                fontSize: 11,
                fontWeight: "bold",
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {segments.map((seg) => (
            <Box key={seg.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: seg.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {seg.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {seg.value}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}