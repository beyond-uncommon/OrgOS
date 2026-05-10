"use client";

import { Box, Typography, Stack, Chip, Divider } from "@mui/material";

interface Entry {
  id: string;
  date: Date;
  reportType: string;
  quickSummary: string;
  attendanceStatus: string;
  outputCompleted: string;
  blockers: string;
  engagementNotes: string;
  totalStudents: number | null;
  studentsPresent: number | null;
  dropouts: number | null;
  user: { id: string; name: string };
  department: { id: string; name: string };
}

interface WeeklyReport {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  status: string;
  department: { id: string; name: string };
  reviewedBy: { name: string } | null;
}

interface Props {
  entries: Entry[];
  weeklyReports: WeeklyReport[];
  hubFilter?: string;
}

export function YCInstructorReportsPanel({ entries, weeklyReports }: Props) {
  return (
    <Stack spacing={3}>
      {/* Daily Entries */}
      <Box>
        <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Recent Daily Entries ({entries.length})
        </Typography>
        {entries.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
            No instructor entries in the last 7 days.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {entries.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                      {entry.user.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Chip
                      label={entry.department.name}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.6rem" }}
                    />
                    {entry.reportType !== "DAILY" && (
                      <Chip
                        label={entry.reportType}
                        size="small"
                        color={entry.reportType === "INCIDENT" ? "error" : "success"}
                        sx={{ fontSize: "0.6rem" }}
                      />
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.75 }}>
                  {entry.quickSummary}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {entry.studentsPresent !== null && (
                    <Chip label={`${entry.studentsPresent} present`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                  )}
                  {entry.dropouts !== null && entry.dropouts > 0 && (
                    <Chip label={`${entry.dropouts} dropouts`} size="small" color="warning" sx={{ fontSize: "0.65rem" }} />
                  )}
                  {entry.blockers && (
                    <Chip label={`Blocker: ${entry.blockers}`} size="small" color="error" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider />

      {/* Weekly Reports */}
      <Box>
        <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Weekly Reports ({weeklyReports.length})
        </Typography>
        {weeklyReports.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
            No weekly reports generated yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {weeklyReports.map((report) => (
              <Box
                key={report.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: "0.8rem" }}>
                      {report.department.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(report.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {new Date(report.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip
                      label={report.status}
                      size="small"
                      color={report.status === "APPROVED" ? "success" : report.status === "DRAFT" ? "default" : "warning"}
                      sx={{ fontSize: "0.6rem" }}
                    />
                    {report.reviewedBy && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        by {report.reviewedBy.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
