import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser, getDepartmentUsersForSession } from "@/modules/youth-coding/queries";
import { SessionForm } from "@/modules/youth-coding/components/SessionForm";
import { UserBar } from "@/components/UserBar";

export default async function SubmitSessionPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  const [existingStudents, departmentUsers] = await Promise.all([
    getStudentsForUser(user.id),
    getDepartmentUsersForSession(user.departmentId),
  ]);

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
        <Container maxWidth="sm">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <UserBar name={user.name} role={user.role} />
              <Typography
                component={Link}
                href="/student"
                sx={{ fontSize: "0.75rem", color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}
              >
                ← Dashboard
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ fontSize: "2.5rem", mb: 1, letterSpacing: "-0.02em" }}>
          Submit Session
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          Record attendance and project progress for today&apos;s youth coding session.
        </Typography>

        <SessionForm
          userId={user.id}
          departmentId={user.departmentId}
          existingStudents={existingStudents.map(s => ({ id: s.id, name: s.name }))}
          departmentUsers={departmentUsers}
        />
      </Container>
    </Box>
  );
}
