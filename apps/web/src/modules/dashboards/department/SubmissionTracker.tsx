"use client";

import { Box, LinearProgress, Typography, Avatar, Chip, Collapse, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import type { InstructorSubmissionStatus } from "../submissionTracker";

interface SubmissionTrackerProps {
  statuses: InstructorSubmissionStatus[];
  submitted: number;
  total: number;
  completionRate: number;
  showDetails?: boolean;
  compact?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getTimeAgo(date?: Date): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SubmissionTracker({ statuses, submitted, total, completionRate, showDetails = true, compact = false }: SubmissionTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const missing = statuses.filter(s => !s.submitted);
  const submittedList = statuses.filter(s => s.submitted);
  const displayMissing = expanded ? missing : missing.slice(0, 3);
  const overflow = missing.length - (expanded ? 0 : 3);

  const isAllIn = submitted === total && total > 0;
  const isEmpty = submitted === 0 && total > 0;

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: isAllIn ? "rgb(var(--mui-palette-success-mainChannel) / 0.3)" : isEmpty ? "rgb(var(--mui-palette-warning-mainChannel) / 0.3)" : "divider",
        borderRadius: 2,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
              Daily Submissions
            </Typography>
            <Chip
              label={`${submitted}/${total}`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: isAllIn
                  ? "rgb(var(--mui-palette-success-mainChannel) / 0.1)"
                  : isEmpty
                  ? "rgb(var(--mui-palette-warning-mainChannel) / 0.1)"
                  : "rgb(var(--mui-palette-primary-mainChannel) / 0.1)",
                color: isAllIn
                  ? "success.main"
                  : isEmpty
                  ? "warning.main"
                  : "primary.main",
                borderRadius: "6px",
              }}
            />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: isAllIn ? "success.main" : isEmpty ? "warning.main" : "primary.main" }}>
            {completionRate}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={completionRate}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: "rgb(var(--mui-palette-grey-500Channel) / 0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              bgcolor: isAllIn ? "success.main" : isEmpty ? "warning.main" : "primary.main",
            },
          }}
        />

        {!compact && showDetails && (
          <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
            {submittedList.slice(0, compact ? 0 : 3).map(s => (
              <Box key={s.userId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 20, height: 20, fontSize: "0.6rem", bgcolor: "rgb(var(--mui-palette-success-mainChannel) / 0.15)", color: "success.main" }}>
                  ✓
                </Avatar>
                <Typography variant="caption" sx={{ color: "text.secondary", flex: 1 }}>
                  {s.userName}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {getTimeAgo(s.submittedAt)}
                </Typography>
              </Box>
            ))}

            {displayMissing.map(s => (
              <Box key={s.userId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 20, height: 20, fontSize: "0.6rem", bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.1)", color: "error.main" }}>
                  ✕
                </Avatar>
                <Typography variant="caption" sx={{ color: "text.secondary", flex: 1 }}>
                  {s.userName}
                </Typography>
              </Box>
            ))}

            {overflow > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Chip
                  label={`${overflow} more not submitted`}
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    cursor: "pointer",
                    bgcolor: "rgb(var(--mui-palette-grey-500Channel) / 0.1)",
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}