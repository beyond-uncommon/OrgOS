import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

export interface InsightCardProps {
  headline: string;
  body: string;
  confidence: number;
  period: string;
  loading?: boolean;
}

export function InsightCard({
  headline,
  body,
  confidence,
  period,
  loading = false,
}: InsightCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const isLowConfidence = confidence < 0.6;

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Skeleton width={100} height={24} />
            <Skeleton width={80} height={24} />
          </Box>
          <Skeleton width="70%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton width="90%" height={16} />
          <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        transition: "box-shadow 150ms ease",
        "&:hover": {
          boxShadow: "0px 4px 16px rgba(16, 24, 40, 0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Chip
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />}
            label="AI Insight"
            size="small"
            variant="outlined"
            sx={{
              color: "#7C3AED",
              borderColor: "#7C3AED",
              "& .MuiChip-icon": { color: "#7C3AED" },
            }}
          />
          {isLowConfidence ? (
            <Chip label={`${confidencePercent}% confidence`} size="small" color="warning" variant="filled" />
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {confidencePercent}% confidence
            </Typography>
          )}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {headline}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {body}
        </Typography>

        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          {period}
        </Typography>
      </CardContent>
    </Card>
  );
}
