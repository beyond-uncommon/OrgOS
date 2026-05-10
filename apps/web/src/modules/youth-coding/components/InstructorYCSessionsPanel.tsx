import { Box, Typography, Stack, Chip } from "@mui/material";

interface AttendanceItem {
  student: { id: string; name: string };
  projectStatus: string;
}

interface Session {
  id: string;
  date: Date;
  lessonNumber: number;
  projectName: string;
  school: string;
  community: string;
  attendance: AttendanceItem[];
  submittedBy: { id: string; name: string };
}

interface Props {
  sessions: Session[];
}

export function InstructorYCSessionsPanel({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No YC sessions recorded this week.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {sessions.map((session) => {
        const present = session.attendance.length;
        const complete = session.attendance.filter((a) => a.projectStatus === "COMPLETE").length;
        const rate = present > 0 ? Math.round((complete / present) * 100) : 0;

        return (
          <Box
            key={session.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2.5,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Lesson {session.lessonNumber} — {session.projectName}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {new Date(session.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <Chip label={`${present} students`} size="small" variant="outlined" sx={{ fontSize: "0.6875rem" }} />
              <Chip
                label={`${rate}% complete`}
                size="small"
                color={rate >= 80 ? "success" : rate >= 50 ? "warning" : "error"}
                sx={{ fontSize: "0.6875rem" }}
              />
              <Chip label={session.school} size="small" variant="outlined" sx={{ fontSize: "0.6875rem" }} />
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Submitted by {session.submittedBy.name} · {session.community}
            </Typography>

            <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {session.attendance.slice(0, 8).map((a) => (
                <Box
                  key={a.student.id}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: a.projectStatus === "COMPLETE"
                      ? "rgb(var(--mui-palette-success-mainChannel) / 0.08)"
                      : "rgb(var(--mui-palette-warning-mainChannel) / 0.08)",
                    border: "1px solid",
                    borderColor: a.projectStatus === "COMPLETE"
                      ? "rgb(var(--mui-palette-success-mainChannel) / 0.2)"
                      : "rgb(var(--mui-palette-warning-mainChannel) / 0.2)",
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.7rem", color: a.projectStatus === "COMPLETE" ? "success.main" : "warning.main" }}>
                    {a.student.name}
                  </Typography>
                </Box>
              ))}
              {session.attendance.length > 8 && (
                <Typography variant="caption" sx={{ color: "text.disabled", alignSelf: "center" }}>
                  +{session.attendance.length - 8} more
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
