import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import type { ResolvedTrend } from "@orgos/shared-types";

// Re-export so callers only need one import
export type { ResolvedTrend as MetricTrend } from "@orgos/shared-types";

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: ResolvedTrend;
  delta?: string;
  period?: string;
  icon?: React.ElementType<SvgIconProps>;
  loading?: boolean;
}

const DIRECTION_ICON = {
  up: ArrowUpwardRoundedIcon,
  down: ArrowDownwardRoundedIcon,
  neutral: RemoveRoundedIcon,
} as const;

const IMPACT_COLOR = {
  positive: "success.main",
  negative: "error.main",
} as const;

function resolveTrend(trend: ResolvedTrend) {
  return {
    Icon: DIRECTION_ICON[trend.direction],
    color: trend.direction === "neutral" ? "text.secondary" : IMPACT_COLOR[trend.impact],
  };
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  delta,
  period,
  icon: Icon,
  loading = false,
}: MetricCardProps) {
  const trendConfig = trend ? resolveTrend(trend) : null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "box-shadow 150ms ease, border-color 150ms ease",
        "&:hover": {
          boxShadow: "0px 4px 16px rgba(16, 24, 40, 0.08)",
          borderColor: "primary.light",
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          p: 3,
          "&:last-child": { pb: 3 },
        }}
      >
        {/* Header row: label + icon */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {loading ? (
            <Skeleton width={100} height={18} />
          ) : (
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: "0.01em" }}
            >
              {label}
            </Typography>
          )}

          {Icon && !loading && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 18, color: "primary.contrastText" }} />
            </Box>
          )}
        </Box>

        {/* Primary value */}
        {loading ? (
          <Skeleton width={120} height={44} />
        ) : (
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
            <Typography
              variant="h4"
              sx={{
                color: "text.primary",
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {value}
            </Typography>
            {unit && (
              <Typography
                variant="h6"
                sx={{ color: "text.secondary", fontWeight: 400 }}
              >
                {unit}
              </Typography>
            )}
          </Box>
        )}

        {/* Trend row */}
        {(trendConfig || period) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {loading ? (
              <Skeleton width={80} height={16} />
            ) : (
              <>
                {trendConfig && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                    }}
                  >
                    <trendConfig.Icon
                      sx={{ fontSize: 14, color: trendConfig.color }}
                    />
                    {delta && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: trendConfig.color,
                        }}
                      >
                        {delta}
                      </Typography>
                    )}
                  </Box>
                )}
                {period && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8125rem",
                      color: "text.secondary",
                      ml: trendConfig ? 0.25 : 0,
                    }}
                  >
                    {period}
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
