import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { DailyEntryForm } from "@/modules/daily-inputs/components/DailyEntryForm";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForInstructor } from "@/modules/dashboards/instructor/queries";
import { UserBar } from "@/components/UserBar";

interface Props {
  searchParams: Promise<{ userId?: string; departmentId?: string }>;
}

export default async function SubmitPage({ searchParams }: Props) {
  const [{ userId, departmentId }, sessionUser] = await Promise.all([
    searchParams,
    getSessionUser(),
  ]);

  const students = userId ? await getStudentsForInstructor(userId) : [];

  if (!userId || !departmentId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography sx={{ color: "error.main", fontSize: "0.875rem" }}>
          Missing userId or departmentId in URL params.
        </Typography>
      </Container>
    );
  }

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
              {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
              <Typography
              component={Link}
              href="/departments/dept-design"
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
            Choose a report type below. Every submission drives the intelligence layer —
            anomaly detection, insight generation, and intervention triggers.
          </Typography>
        </Box>

        <DailyEntryForm userId={userId} departmentId={departmentId} students={students} />
      </Container>
    </Box>
  );
}
