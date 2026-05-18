import { Box, Typography } from "@mui/material";
import { RiskCard } from "@orgos/ui";
import type { Alert, AlertType, Severity } from "@orgos/db";

interface Props {
  alerts: Alert[];
}

export function RisksPanel({ alerts }: Props) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {alerts.map((alert) => {
        const meta = alert.metadata as Record<string, unknown> | null;
        const description = (meta?.description as string | undefined) ?? alert.type.replace(/_/g, " ");
        return (
          <RiskCard
            key={alert.id}
            type={alert.type as AlertType}
            severity={alert.severity as Severity}
            title={alert.type.replace(/_/g, " ")}
            description={description}
            createdAt={alert.createdAt}
          />
        );
      })}
    </Box>
  );
}
