import { Box, Stack, Typography } from "@mui/material";
import type { InsightReport } from "@orgos/shared-types";

interface Props {
  report: InsightReport;
}

const RISK_SEVERITY_COLOR: Record<string, string> = {
  LOW:      "info.main",
  MEDIUM:   "warning.main",
  HIGH:     "error.main",
  CRITICAL: "error.main",
};

export function InsightNarrativePanel({ report }: Props) {
  return (
    <Stack spacing={3.5}>
      {/* Summary */}
      <Box>
        <Typography
          variant="body1"
          sx={{
            fontStyle: "italic",
            color: "text.primary",
          }}
        >
          &ldquo;{report.summary}&rdquo;
        </Typography>
      </Box>

      {/* Active risks */}
      {report.risks.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Identified Risks
          </Typography>
          <Stack spacing={1}>
            {report.risks.map((risk, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-start",
                  py: 1,
                  borderBottom: "1px solid",
                  borderBottomColor: "divider",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: RISK_SEVERITY_COLOR[risk.severity] ?? "warning.main",
                    minWidth: 52,
                    pt: 0.25,
                  }}
                >
                  {risk.severity}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {risk.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Recommended Actions
          </Typography>
          <Stack spacing={1}>
            {report.recommendations.map((rec, i) => (
              <Box key={i} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <Box
                  sx={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {i + 1}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {rec}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5, borderTop: "1px solid", borderTopColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Confidence {Math.round(report.confidence * 100)}%
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Generated{" "}
          {new Date(report.generatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </Typography>
      </Box>
    </Stack>
  );
}
