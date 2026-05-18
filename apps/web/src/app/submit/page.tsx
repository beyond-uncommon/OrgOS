import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyEntryForm } from "@/modules/daily-inputs/components/DailyEntryForm";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForInstructor } from "@/modules/dashboards/instructor/queries";
import { UserBar } from "@/components/UserBar";

export default async function SubmitPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const user = sessionUser!;
  const departmentId = user.departmentId ?? "";
  const students = await getStudentsForInstructor(user.id);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Top bar */}
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
              href={`/departments/${departmentId}`}
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                textDecoration: "none",
                "&:hover": { color: "primary.main" },
                transition: "color 0.15s",
              }}
            >
              ← Dashboard
            </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h3"
            sx={{ fontSize: "2.5rem", color: "text.primary", mb: 1, letterSpacing: "-0.02em" }}
          >
            Submit Report
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
            Choose a report type below. Your input helps track trends, detect issues, and generate insights for your department.
          </Typography>
        </Box>

        <DailyEntryForm departmentId={departmentId} students={students} />
      </Container>
    </Box>
  );
}
