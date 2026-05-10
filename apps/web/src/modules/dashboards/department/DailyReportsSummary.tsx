import { Box, Stack, Typography } from "@mui/material";
import type { User, ExtractedMetric } from "@orgos/db";

interface DailyReportEntry {
  date: Date;
  quickSummary: string;
  attendanceStatus: string;
  outputCompleted: string;
  blockers: string;
  user: Pick<User, "id" | "name" | "email">;
  extractedMetrics: Pick<ExtractedMetric, "metricKey" | "metricValue">[];
}

export function DailyReportsSummary({ grouped }: { grouped: Map<string, DailyReportEntry[]> }) {
  const entries = [...grouped.entries()].filter(([, es]) => es.length > 0);

  if (entries.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No daily reports submitted this week.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {entries.flatMap(([userId, userEntries]) => {
        const latest = userEntries[0];
        if (!latest) return [];
        const instructor = latest.user;
        const metrics = latest.extractedMetrics;
        const daysActive = userEntries.length;

        return (
          <Box
            key={userId}
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2.5,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
                  {instructor.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {instructor.email} &middot; {daysActive} day{daysActive !== 1 ? "s" : ""} this week
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                {new Date(latest.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: "text.primary", mb: 1.5, fontStyle: "italic" }}>
              &ldquo;{latest.quickSummary}&rdquo;
            </Typography>

            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <StatusChip label="Attendance" value={latest.attendanceStatus} />
              <StatusChip label="Output" value={latest.outputCompleted} />
              {metrics.map((m) => {
                const val = typeof m.metricValue === "string" || typeof m.metricValue === "number" ? String(m.metricValue) : "";
                return (
                  <Box
                    key={m.metricKey}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.06)",
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.metricKey.replace(/_/g, " ")}: {val}
                  </Box>
                );
              })}
            </Box>

            {latest.blockers && latest.blockers !== "NONE" && latest.blockers.trim().length > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: "rgb(var(--mui-palette-warning-mainChannel) / 0.08)",
                  border: "1px solid",
                  borderColor: "rgb(var(--mui-palette-warning-mainChannel) / 0.2)",
                }}
              >
                <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600, display: "block", mb: 0.25 }}>
                  Blockers
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {latest.blockers}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.06)",
        fontSize: "0.7rem",
        color: "text.secondary",
        whiteSpace: "nowrap",
      }}
    >
      {label}: {value}
    </Box>
  );
}
