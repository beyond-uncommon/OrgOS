import { Box, Container, Typography } from "@mui/material";
import { LoginForm } from "./LoginForm";

const DEMO_ACCOUNTS = [
  { role: "Instructor",               email: "alex.rivera@uncommon.org",     password: "instructor",   access: "Submit daily reports, personal metrics" },
  { role: "YC Instructor",            email: "instructor.yc1@uncommon.org",  password: "yc1",          access: "YC instructor dashboard, session data" },
  { role: "YC Coordinator",           email: "yc.student1@uncommon.org",     password: "yc.student1",  access: "Submit sessions, manage students, QR attendance" },
  { role: "Hub Lead",                 email: "hublead@uncommon.org",         password: "hublead",      access: "Hub dashboard, instructors, approvals, YC panel" },
  { role: "Hub Lead (Hub 2)",         email: "hublead2@uncommon.org",        password: "hublead2",     access: "Hub 2 dashboard, lower-performance hub" },
  { role: "Hub Lead (Hub 3)",         email: "hublead3@uncommon.org",        password: "hublead3",     access: "Hub 3 dashboard, active risk alerts" },
  { role: "Bootcamp Manager",         email: "bootcamp@uncommon.org",        password: "bootcamp",     access: "All hubs across design bootcamps" },
  { role: "YC Manager",               email: "ycmanager@uncommon.org",       password: "ycmanager",    access: "YC master database, all-hub student roster" },
  { role: "Program Manager",          email: "program@uncommon.org",         password: "program",      access: "All programs — YC, Bootcamp, Teacher Training, Outreach" },
  { role: "Teacher Training Coord",   email: "pm.tt@uncommon.org",           password: "pm.tt",        access: "Teacher Training program view" },
  { role: "Country Director",         email: "director@uncommon.org",        password: "director",     access: "Org-wide KPIs, all programs, org alerts" },
  { role: "Admin",                    email: "admin@uncommon.org",           password: "admin",        access: "Full system access" },
];

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgb(var(--mui-palette-primary-mainChannel) / 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--mui-palette-primary-mainChannel) / 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1, py: 8 }}>
        {/* Wordmark */}
        <Box sx={{ mb: 1, animation: "fade-up 0.5s ease both" }}>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: "4rem", sm: "5.5rem" }, lineHeight: 0.85, letterSpacing: "-0.04em", color: "text.primary" }}
          >
            Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
          </Typography>
        </Box>
        <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 6, animation: "fade-up 0.5s ease 80ms both" }}>
          Organizational Intelligence System
        </Typography>

        {/* Auth form */}
        <Box
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 4,
            mb: 4,
            animation: "fade-up 0.5s ease 160ms both",
          }}
        >
          <Typography variant="h6" sx={{ color: "text.primary", mb: 0.5 }}>
            Sign in
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Use a demo account below to explore different access levels.
          </Typography>
          <LoginForm />
        </Box>

        {/* Demo credentials reference */}
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            opacity: 0.75,
            animation: "fade-up 0.5s ease 240ms both",
            "&:hover": { opacity: 1, transition: "opacity 200ms ease" },
            transition: "opacity 200ms ease",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderBottom: "1px solid",
              borderBottomColor: "divider",
              bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.03)",
            }}
          >
            <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
              Demo Accounts
            </Typography>
          </Box>

          {DEMO_ACCOUNTS.map((account, i) => {
            return (
              <Box
                key={account.email}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderBottom: i < DEMO_ACCOUNTS.length - 1 ? "1px solid" : "none",
                  borderBottomColor: "divider",
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 2,
                  alignItems: "center",
                  bgcolor: i % 2 === 0 ? "transparent" : "rgb(var(--mui-palette-primary-mainChannel) / 0.015)",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block" }}>
                  {account.role}
                </Typography>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontFamily: "monospace", fontSize: "0.7rem" }}>
                    {account.email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, display: "block", fontFamily: "monospace", fontSize: "0.7rem" }}>
                    pw: {account.password}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.secondary" }}>
          Instructor Path · Demo environment
        </Typography>
      </Container>
    </Box>
  );
}
