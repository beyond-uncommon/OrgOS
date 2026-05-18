import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Typography,
} from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { AlertType, Severity } from "@orgos/shared-types";

export interface RiskCardProps {
  type: AlertType;
  severity: Severity;
  title: string;
  description?: string;
  assignee?: string;
  createdAt: Date;
  onResolve?: () => void;
  onAssign?: () => void;
  loading?: boolean;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: "CRITICAL",
    color: "error" as const,
    borderColor: "error.main",
    bg: "error.light",
    bgOpacity: "0.08",
    Icon: ErrorOutlineRoundedIcon,
  },
  HIGH: {
    label: "HIGH",
    color: "warning" as const,
    borderColor: "warning.main",
    bg: "warning.light",
    bgOpacity: "0.08",
    Icon: WarningAmberRoundedIcon,
  },
  MEDIUM: {
    label: "MEDIUM",
    color: "warning" as const,
    borderColor: "divider",
    bg: "warning.light",
    bgOpacity: "0.04",
    Icon: InfoOutlinedIcon,
  },
  LOW: {
    label: "LOW",
    color: "default" as const,
    borderColor: "divider",
    bg: "transparent",
    bgOpacity: "0",
    Icon: InfoOutlinedIcon,
  },
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RiskCard({
  severity,
  title,
  description,
  assignee,
  createdAt,
  onResolve,
  onAssign,
  loading = false,
}: RiskCardProps) {
  const config = SEVERITY_CONFIG[severity];

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Skeleton width={80} height={24} />
            <Skeleton width={60} height={24} />
          </Box>
          <Skeleton width="60%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton width="80%" height={16} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid`,
        borderLeftColor: config.borderColor,
        bgcolor: config.bg,
        opacity: config.bgOpacity ? undefined : undefined,
        transition: "box-shadow 150ms ease",
        "&:hover": {
          boxShadow: "0px 4px 16px rgba(16, 24, 40, 0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={config.label}
              color={severity === "MEDIUM" ? "warning" : config.color}
              size="small"
              variant={severity === "LOW" ? "outlined" : "filled"}
            />
            <config.Icon
              sx={{
                fontSize: 18,
                color: severity === "CRITICAL" || severity === "HIGH" ? config.borderColor : "text.secondary",
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", flexShrink: 0 }}>
            {formatTimestamp(createdAt)}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>

        {description && (
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            {description}
          </Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          {assignee ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Assigned to: {assignee}
            </Typography>
          ) : (
            <Box />
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            {onAssign && (
              <Button variant="text" size="small" onClick={onAssign}>
                Assign
              </Button>
            )}
            {onResolve && (
              <Button variant="text" size="small" color="primary" onClick={onResolve}>
                Resolve
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
