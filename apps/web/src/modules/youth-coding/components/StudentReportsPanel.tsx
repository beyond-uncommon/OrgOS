import { Box, Typography, Stack } from "@mui/material";
import type { StudentReport } from "@orgos/shared-types";

interface Props {
  reports: (StudentReport & { student: { name: string } })[];
}

export function StudentReportsPanel({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No student reports yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {reports.map((report) => (
        <Box
          key={report.id}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2.5,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {report.student.name}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Box
                  key={star}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: star <= report.rating ? "warning.main" : "action.hover",
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Learned
            </Typography>
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {report.learned}
            </Typography>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Enjoyed
            </Typography>
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {report.enjoyed}
            </Typography>
          </Box>

          {report.struggled && (
            <Box>
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                Struggled
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {report.struggled}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
            {new Date(report.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
