import { Box, Stack, Typography } from "@mui/material";
import type { Alert } from "@orgos/db";

const SEVERITY_PALETTE = {
  LOW:      { colorToken: "info.main",    channel: "var(--mui-palette-info-mainChannel)"    },
  MEDIUM:   { colorToken: "warning.main", channel: "var(--mui-palette-warning-mainChannel)" },
  HIGH:     { colorToken: "error.main",   channel: "var(--mui-palette-error-mainChannel)"   },
  CRITICAL: { colorToken: "error.main",   channel: "var(--mui-palette-error-mainChannel)"   },
} as const;

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

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
            boxShadow: "0 0 8px var(--mui-palette-success-main)",
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

  const sorted = [...alerts].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 3) -
      (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 3),
  );

  return (
    <Stack spacing={1.5}>
      {sorted.map((alert) => {
        const meta = alert.metadata as Record<string, unknown> | null;
        const description = meta?.description as string | undefined;
        const cfg = SEVERITY_PALETTE[alert.severity as keyof typeof SEVERITY_PALETTE] ?? SEVERITY_PALETTE.MEDIUM;

        return (
          <Box
            key={alert.id}
            sx={{
              bgcolor: `rgb(${cfg.channel} / 0.08)`,
              border: "1px solid",
              borderColor: `rgb(${cfg.channel} / 0.25)`,
              borderLeft: "3px solid",
              borderLeftColor: cfg.colorToken,
              borderRadius: 1.5,
              p: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    bgcolor: cfg.colorToken,
                    boxShadow: `0 0 6px rgb(${cfg.channel})`,
                  }}
                />
                <Typography variant="overline" sx={{ color: cfg.colorToken }}>
                  {alert.severity}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ color: "text.primary", mb: 0.5 }}>
              {alert.type.replace(/_/g, " ")}
            </Typography>
            {description && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {description}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
