import * as React from "react";
import { Chip, type ChipProps } from "@mui/material";
import type { ReportStatus, EntryStatus, InterventionStatus } from "@orgos/shared-types";

export interface StatusChipProps {
  status: ReportStatus | EntryStatus | InterventionStatus;
  size?: "small" | "medium";
}

const COLOR_MAP: Record<string, ChipProps["color"]> = {
  DRAFT: "default",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  PUBLISHED: "primary",
  SUBMITTED: "info",
  PROCESSING: "warning",
  COMPLETE: "success",
  FLAGGED: "error",
  OPEN: "error",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  PENDING: "warning",
  DENIED: "error",
  REJECTED: "error",
  EXPIRED: "default",
  EXECUTED: "success",
};

const TERMINAL_STATES = new Set([
  "PUBLISHED",
  "RESOLVED",
  "EXECUTED",
  "REJECTED",
  "EXPIRED",
  "DENIED",
]);

export function StatusChip({ status, size = "small" }: StatusChipProps) {
  const isTerminal = TERMINAL_STATES.has(status);
  return (
    <Chip
      label={status.replace(/_/g, " ")}
      color={COLOR_MAP[status] ?? "default"}
      size={size}
      variant={isTerminal ? "outlined" : "filled"}
    />
  );
}
