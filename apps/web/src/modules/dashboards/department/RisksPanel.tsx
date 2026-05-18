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
          py: 3,
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "success.main",
            boxShadow: "0 0 8px #22C55E",
            mx: "auto",
            mb: 1,
          }}
        />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No active anomalies detected
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
