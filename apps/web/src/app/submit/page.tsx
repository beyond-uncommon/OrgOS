import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyEntryForm } from "@/modules/daily-inputs/components/DailyEntryForm";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForInstructor } from "@/modules/dashboards/instructor/queries";
import { getStudentsForUser } from "@/modules/youth-coding/queries";
import { UserBar } from "@/components/UserBar";

type SubmitOption = {
  id: string;
  title: string;
  description: string;
  href?: string | null;
  color: string;
  roles: string[];
};

const SUBMIT_OPTIONS: SubmitOption[] = [
  {
    id: "daily",
    title: "Daily Report",
    description: "Attendance, outputs, engagement, blockers",
    href: "#daily",
    color: "primary",
    roles: [
      "INSTRUCTOR", "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
      "COUNTRY_DIRECTOR", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
      "YOUTH_CODING_MANAGER", "TEACHER_TRAINING_COORDINATOR",
      "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD", "SAFEGUARDING",
      "M_AND_E", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
      "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
      "HEAD_OF_OPERATIONS", "ADMIN",
    ],
  },
  {
    id: "incident",
    title: "Incident Report",
    description: "Safety issues, conflicts, emergencies",
    href: "#incident",
    color: "error",
    roles: [
      "INSTRUCTOR", "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
      "COUNTRY_DIRECTOR", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
      "YOUTH_CODING_MANAGER", "TEACHER_TRAINING_COORDINATOR",
      "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD", "SAFEGUARDING",
      "M_AND_E", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
      "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
      "HEAD_OF_OPERATIONS", "ADMIN",
    ],
  },
  {
    id: "session",
    title: "Session Report",
    description: "Workshop, field trip, or special session",
    href: "#session",
    color: "success",
    roles: [
      "INSTRUCTOR", "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
      "COUNTRY_DIRECTOR", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
      "YOUTH_CODING_MANAGER", "TEACHER_TRAINING_COORDINATOR",
      "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD", "SAFEGUARDING",
      "M_AND_E", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
      "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
      "HEAD_OF_OPERATIONS", "ADMIN",
    ],
  },
  {
    id: "yc-session",
    title: "YC Session",
    description: "Youth coding lesson + attendance + student feedback",
    href: "/submit-session",
    color: "info",
    roles: ["STUDENT"],
  },
  {
    id: "yc-feedback",
    title: "Student Feedback",
    description: "Collect daily feedback from students",
    href: "/yc/feedback",
    color: "warning",
    roles: ["STUDENT"],
  },
  {
    id: "yc-attendance",
    title: "Hub Attendance",
    description: "QR attendance check-in for today's session",
    href: null, // requires departmentId, handled in page
    color: "warning",
    roles: ["INSTRUCTOR", "HUB_LEAD", "YOUTH_CODING_MANAGER"],
  },
];

function getDashboardHref(role: string, departmentId: string | null, userId: string): string {
  switch (role) {
    case "INSTRUCTOR":
      return `/departments/${departmentId}/instructors/${userId}`;
    case "HUB_LEAD":
    case "REGIONAL_HUB_LEAD":
      return `/departments/${departmentId}`;
    case "BOOTCAMP_MANAGER":
      return `/bootcamps/${departmentId}`;
    case "YOUTH_CODING_MANAGER":
      return `/youth-coding`;
    case "TEACHER_TRAINING_COORDINATOR":
      return `/programs/${departmentId}`;
    case "PROGRAM_MANAGER":
      return `/programs`;
    case "COUNTRY_DIRECTOR":
      return `/country`;
    case "STUDENT":
      return `/student`;
    default:
      return `/`;
  }
}

export default async function SubmitPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const user = sessionUser!;
  const departmentId = user.departmentId ?? "";

  const students = user.role === "STUDENT"
    ? await getStudentsForUser(user.id)
    : await getStudentsForInstructor(user.id);

  const dashboardHref = getDashboardHref(user.role, user.departmentId, user.id);

  const availableOptions = SUBMIT_OPTIONS.filter((opt) => {
    if (opt.id === "yc-attendance") return !!departmentId;
    return true;
  }).filter((opt) => opt.roles.includes(user.role));

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
              <UserBar name={user.name} role={user.role} showSubmit={false} />
              <Typography
                component={Link}
                href={dashboardHref}
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

        {/* Report type cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2, mb: 4 }}>
          {availableOptions.map((opt) => {
            const isExternalLink = !!opt.href && !opt.href.startsWith("#");
            return (
              <Box
                key={opt.id}
                {...(isExternalLink ? {
                  component: Link,
                  href: opt.id === "yc-attendance" ? `/yc/attendance/${departmentId}` : opt.href!,
                } : {})}
                sx={{
                  ...(isExternalLink ? {
                    textDecoration: "none",
                    color: "inherit",
                  } : {}),
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: `rgb(var(--mui-palette-${opt.color}-mainChannel) / 0.2)`,
                  bgcolor: `rgb(var(--mui-palette-${opt.color}-mainChannel) / 0.04)`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  "&:hover": {
                    borderColor: `rgb(var(--mui-palette-${opt.color}-mainChannel) / 0.5)`,
                    bgcolor: `rgb(var(--mui-palette-${opt.color}-mainChannel) / 0.08)`,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ color: `${opt.color}.main`, fontWeight: 600 }}>
                  {opt.title}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {opt.description}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Daily Entry Form (for DAILY, INCIDENT, SESSION types) */}
        <Box id="daily" sx={{ mb: 4 }} />
        <Box id="incident" sx={{ mb: 4 }} />
        <Box id="session" sx={{ mb: 4 }} />
        <DailyEntryForm
          departmentId={departmentId}
          students={students.map(s => ({ id: s.id, name: s.name, enrollmentStatus: s.enrollmentStatus }))}
        />
      </Container>
    </Box>
  );
}
