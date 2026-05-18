"use client";

import * as React from "react";
import {
  Box, Typography, Container, Stack, Chip, Button,
  Divider, Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EventNoteIcon from "@mui/icons-material/EventNote";

const ROLE_META: Record<string, {
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  focus: string[];
}> = {
  HEAD_OF_OPERATIONS: {
    label: "Head of Operations",
    description: "Oversee all operational metrics, hub performance, and resource allocation across the organization.",
    color: "primary.main",
    icon: <TrendingUpIcon />,
    focus: ["All Hubs", "Resource Allocation", "Operational Efficiency"],
  },
  HEAD_OF_DESIGN: {
    label: "Head of Design",
    description: "Monitor curriculum design quality, learning materials, and design program outcomes.",
    color: "#7C3AED",
    icon: <SchoolOutlinedIcon />,
    focus: ["Curriculum", "Learning Materials", "Design Outcomes"],
  },
  HEAD_OF_DEVELOPMENT: {
    label: "Head of Development",
    description: "Track technical program quality, student coding progress, and development bootcamp outcomes.",
    color: "#059669",
    icon: <TrendingUpIcon />,
    focus: ["Technical Programs", "Coding Progress", "Dev Outcomes"],
  },
  SAFEGUARDING: {
    label: "Safeguarding",
    description: "Monitor safety incidents, child protection concerns, and safeguarding compliance across all programs.",
    color: "error.main",
    icon: <WarningAmberIcon />,
    focus: ["Incidents", "Protection Concerns", "Compliance"],
  },
  M_AND_E: {
    label: "M&E",
    description: "Monitor and evaluate program outcomes, impact metrics, and data quality across all initiatives.",
    color: "info.main",
    icon: <CheckCircleOutlineIcon />,
    focus: ["Outcomes", "Impact Metrics", "Data Quality"],
  },
  MARKETING_COMMS_MANAGER: {
    label: "Marketing & Communications",
    description: "Track brand reach, communications output, media coverage, and community engagement.",
    color: "warning.main",
    icon: <EventNoteIcon />,
    focus: ["Brand Reach", "Media Coverage", "Engagement"],
  },
  BUSINESS_DEVELOPMENT_MANAGER: {
    label: "Business Development",
    description: "Monitor partnerships, revenue opportunities, grant applications, and donor relationships.",
    color: "success.main",
    icon: <AttachMoneyIcon />,
    focus: ["Partnerships", "Grants", "Donor Relations"],
  },
  BUSINESS_DEVELOPMENT_ASSOCIATE: {
    label: "Business Development Associate",
    description: "Support business development activities, research prospects, and maintain partner databases.",
    color: "success.main",
    icon: <AttachMoneyIcon />,
    focus: ["Research", "Prospects", "Database"],
  },
  CAREER_DEVELOPMENT_OFFICER: {
    label: "Career Development",
    description: "Track graduate outcomes, job placements, internship placements, and career pathway programs.",
    color: "secondary.main",
    icon: <SchoolOutlinedIcon />,
    focus: ["Placements", "Outcomes", "Pathways"],
  },
  REGIONAL_HUB_LEAD: {
    label: "Regional Hub Lead",
    description: "Manage hub operations across your region, coordinate hub leads, and monitor regional performance.",
    color: "primary.main",
    icon: <PeopleOutlinedIcon />,
    focus: ["Regional Hubs", "Hub Coordination", "Performance"],
  },
  HR_OFFICER: {
    label: "HR Officer",
    description: "Manage staff records, payroll, recruitment, performance reviews, and HR compliance.",
    color: "info.main",
    icon: <PeopleOutlinedIcon />,
    focus: ["Staff Records", "Payroll", "Recruitment"],
  },
  FINANCE_ADMIN_OFFICER: {
    label: "Finance & Admin",
    description: "Oversee budgets, expenses, financial reporting, and administrative operations.",
    color: "warning.main",
    icon: <AttachMoneyIcon />,
    focus: ["Budgets", "Expenses", "Financial Reports"],
  },
};

interface StatsCard {
  label: string;
  value: string | number;
  sub?: string;
}

interface AlertItem {
  type: string;
  severity: string;
  message: string;
  date: string;
}

interface Props {
  role: string;
  stats: StatsCard[];
  alerts: AlertItem[];
  recentActivity: { date: string; description: string; type: string }[];
  hasAlerts: boolean;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SeverityChip({ severity }: { severity: string }) {
  const color = severity === "CRITICAL" || severity === "HIGH" ? "error" : severity === "MEDIUM" ? "warning" : "info";
  return <Chip label={severity} size="small" color={color} sx={{ fontSize: "0.625rem", fontWeight: 700 }} />;
}

export function RoleDashboardClient({ role, stats, alerts, recentActivity, hasAlerts }: Props) {
  const meta = ROLE_META[role] ?? {
    label: role,
    description: "Dashboard for this role.",
    color: "primary.main",
    icon: <TrendingUpIcon />,
    focus: [],
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <Box sx={{
        borderBottom: "1px solid", borderBottomColor: "divider",
        bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
        backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ color: meta.color, display: "flex", alignItems: "center", fontSize: 20 }}>
                {meta.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {meta.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  OrgOS Dashboard
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Button
                component={Link}
                href="/submit"
                size="small"
                variant="contained"
                sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 2, py: 0.6 }}
              >
                Submit
              </Button>
              {["HUB_LEAD", "INSTRUCTOR", "PROGRAM_MANAGER", "BOOTCAMP_MANAGER", "YOUTH_CODING_MANAGER"].includes(role) && (
                <Button
                  component={Link}
                  href="/approvals"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.7rem", textTransform: "none", borderRadius: 1.5 }}
                >
                  Approvals
                </Button>
              )}
              <Button
                component={Link}
                href="/insights"
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.7rem", textTransform: "none", borderRadius: 1.5 }}
              >
                Insights
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* ── ROLE HEADER ──────────────────────────────────── */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>
            {meta.label}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 600, mb: 2 }}>
            {meta.description}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {meta.focus.map((f) => (
              <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
            ))}
          </Box>
        </Box>

        {/* ── ALERTS ─────────────────────────────────────────── */}
        {hasAlerts && (
          <Box sx={{ mb: 4 }}>
            <Stack spacing={1.5}>
              {alerts.map((alert, i) => (
                <Alert
                  key={i}
                  severity={alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "error" : "warning"}
                  icon={<WarningAmberIcon />}
                  sx={{ alignItems: "center" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {alert.type.replace(/_/g, " ")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.disabled" }}>
                      {alert.date}
                    </Typography>
                  </Box>
                </Alert>
              ))}
            </Stack>
          </Box>
        )}

        {/* ── STATS ─────────────────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
              <Box sx={{
                bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
                borderRadius: 3, p: 3, textAlign: "center",
              }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: meta.color, mb: 0.5 }}>
                  {typeof stat.value === "number" ? stat.value.toLocaleString("en-US") : stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {stat.label}
                </Typography>
                {stat.sub && (
                  <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
                    {stat.sub}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* ── RECENT ACTIVITY ──────────────────────────────── */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Recent Activity</Typography>
          {recentActivity.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No recent activity
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {recentActivity.map((item, i) => (
                <Box key={i} sx={{
                  display: "flex", gap: 2, alignItems: "flex-start",
                  p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2,
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.description}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                      <Chip label={item.type} size="small" sx={{ fontSize: "0.625rem" }} />
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>{item.date}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* ── NAVIGATION LINKS ─────────────────────────────── */}
        <Grid container spacing={2}>
          {[
            { label: "Reports", href: "/reports", desc: "Auto-generated weekly & monthly reports" },
            { label: "Metrics", href: "/metrics", desc: "Extracted metrics from daily entries" },
            { label: "Insights", href: "/insights", desc: "AI-generated insights and analysis" },
            { label: "Interventions", href: "/interventions", desc: "Track and resolve active interventions" },
          ].map((link) => (
            <Grid key={link.href} size={{ xs: 6, md: 3 }}>
              <Box
                component={Link}
                href={link.href}
                sx={{
                  display: "block", p: 3, bgcolor: "background.paper",
                  border: "1px solid", borderColor: "divider", borderRadius: 2,
                  textDecoration: "none", color: "inherit",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                  transition: "all 0.15s",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{link.label} →</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>{link.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}