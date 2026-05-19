"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Grid2 as Grid,
  Button,
  TextField,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import StarIcon from "@mui/icons-material/Star";

interface StudentReport {
  id: string;
  date: Date;
  rating: number;
  learned: string;
  enjoyed: string;
  struggled: string | null;
}

interface Session {
  id: string;
  date: Date;
  projectStatus: string;
  projectName: string;
  instructor: { name: string };
}

interface DailyEntryRef {
  id: string;
  date: Date;
  quickSummary: string;
  user: { name: string };
}

interface StudentData {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  community: string | null;
  grade: string | null;
  enrollmentStatus: string;
  createdAt: Date;
  department: { id: string; name: string };
  instructor: { id: string; name: string };
  sessionCount: number;
  reportCount: number;
  avgRating: number | null;
  linkedPrograms: string[];
  firstEnrollmentDate: Date | null;
  lastActivityDate: Date | null;
  allReports: StudentReport[];
  allSessions: Session[];
  dailyEntries: DailyEntryRef[];
}

interface StudentDetailClientProps {
  user: { name: string; role: string };
  student: StudentData;
  handleStatusChange: (formData: FormData) => Promise<void>;
  handleAddNote: (formData: FormData) => Promise<void>;
}

const programLabels: Record<string, string> = {
  "youth-coding": "Youth Coding",
  bootcamp: "Bootcamp",
  "teacher-training": "Teacher Training",
  outreach: "Outreach",
};

const statusColors: Record<string, "success" | "error" | "warning" | "default"> = {
  ACTIVE: "success",
  DROPPED: "error",
  GRADUATED: "warning",
  PAUSED: "default",
};

export function StudentDetailClient({
  user,
  student,
  handleStatusChange,
  handleAddNote,
}: StudentDetailClientProps) {
  const [tab, setTab] = React.useState(0);
  const [note, setNote] = React.useState("");

  const timelineEvents = React.useMemo(() => {
    const events: Array<{ date: Date; type: string; description: string }> = [];
    
    if (student.firstEnrollmentDate) {
      events.push({
        date: new Date(student.firstEnrollmentDate),
        type: "enrolled",
        description: `Joined ${student.department.name}`,
      });
    }

    if (student.lastActivityDate) {
      events.push({
        date: new Date(student.lastActivityDate),
        type: "activity",
        description: "Last activity recorded",
      });
    }

    student.allSessions.slice(0, 3).forEach(s => {
      events.push({
        date: new Date(s.date),
        type: "session",
        description: `Session: ${s.projectName}`,
      });
    });

    student.allReports.slice(0, 2).forEach(r => {
      events.push({
        date: new Date(r.date),
        type: "feedback",
        description: "Feedback submitted",
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [student]);

  const statusOptions = ["ACTIVE", "DROPPED", "GRADUATED", "PAUSED"];

  const handleNoteSubmit = async () => {
    const formData = new FormData();
    formData.append("note", note);
    await handleAddNote(formData);
    setNote("");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                component={Link}
                href="/students"
                startIcon={<ArrowBackIcon />}
                sx={{ color: "text.secondary" }}
              >
                Back
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Student Detail
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {user.name} · {user.role.replace(/_/g, " ")}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              sx={{
                p: 4,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {student.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {student.linkedPrograms.map(p => (
                      <Chip
                        key={p}
                        label={programLabels[p] || p}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    <Chip
                      label={student.enrollmentStatus}
                      size="small"
                      color={statusColors[student.enrollmentStatus] || "default"}
                    />
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Age
                    </Typography>
                  </Box>
                  <Typography variant="h6">{student.age ?? "-"}</Typography>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <SchoolIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      School
                    </Typography>
                  </Box>
                  <Typography variant="h6">{student.school ?? "-"}</Typography>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <CalendarTodayIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Enrolled
                    </Typography>
                  </Box>
                  <Typography variant="h6">
                    {student.firstEnrollmentDate
                      ? new Date(student.firstEnrollmentDate).toLocaleDateString()
                      : "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <StarIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Avg Rating
                    </Typography>
                  </Box>
                  <Typography variant="h6">{student.avgRating ?? "-"}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  px: 2,
                }}
              >
                <Tab label={`Sessions (${student.allSessions.length})`} />
                <Tab label={`Feedback (${student.allReports.length})`} />
                <Tab label={`Notes (${student.dailyEntries.length})`} />
              </Tabs>

              <Box sx={{ p: 3 }}>
                {tab === 0 && (
                  <Box>
                    {student.allSessions.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        No sessions recorded yet.
                      </Typography>
                    ) : (
                      student.allSessions.map(session => (
                        <Box
                          key={session.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {session.projectName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {new Date(session.date).toLocaleDateString()} · {session.instructor.name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            icon={session.projectStatus === "COMPLETE" ? <CheckCircleIcon /> : <WarningIcon />}
                            label={session.projectStatus}
                            color={session.projectStatus === "COMPLETE" ? "success" : "warning"}
                          />
                        </Box>
                      ))
                    )}
                  </Box>
                )}

                {tab === 1 && (
                  <Box>
                    {student.allReports.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        No feedback submitted yet.
                      </Typography>
                    ) : (
                      student.allReports.map(report => (
                        <Box
                          key={report.id}
                          sx={{
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              {new Date(report.date).toLocaleDateString()}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <StarIcon
                                  key={star}
                                  sx={{
                                    fontSize: 16,
                                    color: star <= report.rating ? "warning.main" : "grey.300",
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Learned:</strong> {report.learned}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Enjoyed:</strong> {report.enjoyed}
                          </Typography>
                          {report.struggled && (
                            <Typography variant="body2">
                              <strong>Struggled with:</strong> {report.struggled}
                            </Typography>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                )}

                {tab === 2 && (
                  <Box>
                    {student.dailyEntries.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        No notes found.
                      </Typography>
                    ) : (
                      student.dailyEntries.map(entry => (
                        <Box
                          key={entry.id}
                          sx={{
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {new Date(entry.date).toLocaleDateString()} — {entry.user.name}
                          </Typography>
                          <Typography variant="body2">{entry.quickSummary}</Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Timeline
              </Typography>
              <Box sx={{ position: "relative", pl: 3 }}>
                {timelineEvents.slice(0, 6).map((event, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: "relative",
                      pb: 3,
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: "-12px",
                        top: "6px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: "-9px",
                        top: "18px",
                        width: "2px",
                        height: "calc(100% - 12px)",
                        bgcolor: index === timelineEvents.slice(0, 6).length - 1 ? "transparent" : "divider",
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {event.type === "enrolled" && "Enrolled"}
                      {event.type === "session" && "Session"}
                      {event.type === "feedback" && "Feedback"}
                      {event.type === "activity" && "Activity"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {event.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {new Date(event.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Actions
              </Typography>

              <Box component="form" action={handleStatusChange} sx={{ mb: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Change Status</InputLabel>
                  <Select
                    name="status"
                    defaultValue={student.enrollmentStatus}
                    label="Change Status"
                  >
                    {statusOptions.map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Update Status
                </Button>
              </Box>

              <Box>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleNoteSubmit}
                  disabled={!note.trim()}
                >
                  Add Note
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}