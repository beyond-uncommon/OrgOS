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
import type { Severity, InterventionStatus } from "@orgos/shared-types";

export interface InterventionCardProps {
  id: string;
  issueType: string;
  severity: Severity;
  status: InterventionStatus;
  assigneeName: string;
  notes?: string;
  createdAt: Date;
  onStatusChange?: (id: string, status: InterventionStatus) => void;
  loading?: boolean;
}

const STATUS_COLORS: Record<InterventionStatus, "error" | "warning" | "default"> = {
  OPEN: "error",
  IN_PROGRESS: "warning",
  RESOLVED: "default",
};

const SEVERITY_CHIP_COLORS: Record<Severity, "error" | "warning" | "info" | "default"> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default",
};

export function InterventionCard({
  id,
  issueType,
  severity,
  status,
  assigneeName,
  notes,
  onStatusChange,
  loading = false,
}: InterventionCardProps) {
  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Skeleton width={80} height={24} />
            <Skeleton width={60} height={24} />
          </Box>
          <Skeleton width="50%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton width="40%" height={16} sx={{ mb: 1 }} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Skeleton width={100} height={32} />
            <Skeleton width={100} height={32} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const isTerminal = status === "RESOLVED";

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: isTerminal ? 0.6 : 1,
        transition: "box-shadow 150ms ease, opacity 150ms ease",
        "&:hover": {
          boxShadow: isTerminal ? "none" : "0px 4px 16px rgba(16, 24, 40, 0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Chip
            label={status.replace("_", " ")}
            color={STATUS_COLORS[status]}
            size="small"
            variant={isTerminal ? "outlined" : "filled"}
          />
          <Chip
            label={severity}
            color={SEVERITY_CHIP_COLORS[severity]}
            size="small"
            variant="outlined"
          />
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {issueType}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {assigneeName}
        </Typography>

        {notes && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            {notes}
          </Typography>
        )}

        {onStatusChange && !isTerminal && (
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            {status === "OPEN" && (
              <Button variant="text" size="small" onClick={() => onStatusChange(id, "IN_PROGRESS")}>
                Mark In Progress
              </Button>
            )}
            {status === "IN_PROGRESS" && (
              <Button variant="text" size="small" color="primary" onClick={() => onStatusChange(id, "RESOLVED")}>
                Mark Resolved
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
