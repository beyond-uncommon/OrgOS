"use client";
import * as React from "react";
import { Box, Typography, Button } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { RiskCard } from "@orgos/ui";
import type { Alert, AlertType, Severity } from "@orgos/db";
import { DrillDownModal } from "../DrillDownModal";

interface Props {
  alerts: Alert[];
  hubName?: string;
}

const METRIC_FROM_ALERT_TYPE: Record<string, string> = {
  ATTENDANCE_DROP: "attendance_rate",
  ENGAGEMENT_LOW: "engagement_score",
  DROPOUT_SPIKE: "dropout_count",
  OUTPUT_DECLINE: "output_count",
  BLOCKER_SURGE: "blocker_present",
  MISSING_ENTRIES: "attendance_rate",
};

export function RisksPanel({ alerts, hubName = "Department" }: Props) {
  const [selectedAlert, setSelectedAlert] = React.useState<{
    departmentId: string;
    metric: string;
  } | null>(null);

  if (alerts.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "success.main",
            boxShadow: "0 0 10px #22C55E",
            mx: "auto",
            mb: 1.5,
            animation: "pulse-dot 2.4s ease-in-out infinite",
          }}
        />
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
          All clear — no active anomalies
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, display: "block", mt: 0.5 }}>
          System monitoring continuously
        </Typography>
      </Box>
    );
  }

  const handleDrillDown = (alert: Alert) => {
    const meta = alert.metadata as Record<string, unknown> | null;
    const departmentId = (meta?.departmentId as string) ?? "";
    const metric = METRIC_FROM_ALERT_TYPE[alert.type] ?? "attendance_rate";
    setSelectedAlert({ departmentId, metric });
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {alerts.map((alert) => {
          const meta = alert.metadata as Record<string, unknown> | null;
          const description = (meta?.description as string | undefined) ?? alert.type.replace(/_/g, " ");
          return (
            <Box key={alert.id} sx={{ position: "relative" }}>
              <RiskCard
                type={alert.type as AlertType}
                severity={alert.severity as Severity}
                title={alert.type.replace(/_/g, " ")}
                description={description}
                createdAt={alert.createdAt}
              />
              <Button
                size="small"
                startIcon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleDrillDown(alert)}
                sx={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: "grey.100",
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                  },
                }}
              >
                Why?
              </Button>
            </Box>
          );
        })}
      </Box>
      {selectedAlert && (
        <DrillDownModal
          open={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          departmentId={selectedAlert.departmentId}
          metric={selectedAlert.metric}
          hubName={hubName}
        />
      )}
    </>
  );
}
