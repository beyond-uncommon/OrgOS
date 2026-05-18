import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser, getDepartmentUsersForSession } from "@/modules/youth-coding/queries";
import { SessionForm } from "@/modules/youth-coding/components/SessionForm";
import { UserBar } from "@/components/UserBar";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";

export default async function StudentSessionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  const [students, departmentUsers] = await Promise.all([
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
        <Container maxWidth="md">
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

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>
          Submit Session
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          Record today&apos;s lesson and mark student attendance.
          {students.length === 0 && " Register your first student below."}
        </Typography>

        <Box sx={{ bgcolor: "background.paper", p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <SessionForm existingStudents={students} departmentUsers={departmentUsers} />
        </Box>
      </Container>
    </Box>
  );
}