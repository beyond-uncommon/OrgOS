import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser, getSessionsForUser } from "@/modules/youth-coding/queries";
import { UserBar } from "@/components/UserBar";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  const [students, sessions] = await Promise.all([
    getStudentsForUser(user.id),
    getSessionsForUser(user.id),
  ]);

  const totalPresent = sessions.flatMap(s => s.attendance).length;
  const totalComplete = sessions
    .flatMap(s => s.attendance)
    .filter(a => a.projectStatus === "COMPLETE").length;
  const completionRate =
    totalPresent > 0 ? Math.round((totalComplete / totalPresent) * 100) : 0;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <UserBar name={user.name} role={user.role} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>
          {user.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          Youth Coding Coordinator
        </Typography>

        <Box sx={{ display: "flex", gap: 4, mb: 5, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{students.length}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Registered Students</Typography>
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{sessions.length}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Sessions Submitted</Typography>
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{completionRate}%</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Completion Rate</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Box
            component={Link}
            href="/submit-session"
            sx={{
              px: 3, py: 2, border: "1px solid", borderColor: "divider",
              borderRadius: 2, textDecoration: "none", color: "text.primary",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>Submit Session →</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Record today&apos;s session</Typography>
          </Box>
          <Box
            component={Link}
            href="/student/students"
            sx={{
              px: 3, py: 2, border: "1px solid", borderColor: "divider",
              borderRadius: 2, textDecoration: "none", color: "text.primary",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>My Students →</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>View registered students</Typography>
          </Box>
        </Box>

        {sessions.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>Recent Sessions</Typography>
            {sessions.slice(0, 5).map(s => (
              <Box
                key={s.id}
                sx={{ py: 1.5, borderBottom: "1px solid", borderBottomColor: "divider" }}
              >
                <Typography variant="body2">
                  Lesson {s.lessonNumber} — {s.projectName}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {new Date(s.date).toLocaleDateString()} · {s.attendance.length} students ·{" "}
                  {s.school}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
