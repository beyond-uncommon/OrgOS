"use client";
import * as React from "react";
import { Box, Typography, Button } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { Severity } from "@orgos/db";
import { DrillDownModal } from "./DrillDownModal";

interface DrillDownTriggerProps {
  departmentId: string;
  metric: string;
  triggerLabel?: string;
  severity?: Severity;
}

const SEVERITY_COLORS: Record<string, "error" | "warning" | "info" | "default"> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "warning",
  LOW: "info",
};

export function DrillDownTrigger({
  departmentId,
  metric,
  triggerLabel = "Why?",
  severity,
}: DrillDownTriggerProps) {
  const [open, setOpen] = React.useState(false);
  const color = severity ? SEVERITY_COLORS[severity] ?? "info" : "info";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <Button
        size="small"
        startIcon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
        onClick={handleClick}
        sx={{
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "none",
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? `${color}.main`
              : `${color}.light`,
          color: (theme) =>
            theme.palette.mode === "dark"
              ? `${color}.contrastText`
              : `${color}.main`,
          "&:hover": {
            bgcolor: `${color}.main`,
            color: `${color}.contrastText`,
          },
        }}
      >
        {triggerLabel}
      </Button>
      <DrillDownModal
        open={open}
        onClose={() => setOpen(false)}
        departmentId={departmentId}
        metric={metric}
        hubName=""
      />
    </>
  );
}

interface MetricDrilldownProviderProps {
  children: React.ReactNode;
  hubName: string;
  departmentId: string;
}

export function MetricDrilldownProvider({
  children,
  hubName,
  departmentId,
}: MetricDrilldownProviderProps) {
  const [open, setOpen] = React.useState(false);
  const [params, setParams] = React.useState<{
    departmentId: string;
    metric: string;
  } | null>(null);

  React.useEffect(() => {
    function handleOpenDrillDown(e: CustomEvent<{ departmentId: string; metric: string }>) {
      setParams(e.detail);
      setOpen(true);
    }
    window.addEventListener("openDrillDown", handleOpenDrillDown as EventListener);
    return () => {
      window.removeEventListener("openDrillDown", handleOpenDrillDown as EventListener);
    };
  }, []);

  return (
    <>
      {children}
      {params && (
        <DrillDownModal
          open={open}
          onClose={() => setOpen(false)}
          departmentId={params.departmentId}
          metric={params.metric}
          hubName={hubName}
        />
      )}
    </>
  );
}

export { DrillDownModal } from "./DrillDownModal";