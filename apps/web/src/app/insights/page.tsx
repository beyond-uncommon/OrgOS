import { redirect } from "next/navigation";
import { prisma, MetricSource } from "@orgos/db";
import { Box, Typography, Container, Alert, Chip, Stack, Divider } from "@mui/material";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Link from "next/link";
import Button from "@mui/material/Button";
import { requireAccess } from "@/lib/auth/requireAccess";

export default async function InsightsPage() {
  const { user, departmentIds } = await requireAccess([
    "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR",
    "YOUTH_CODING_MANAGER", "ADMIN", "HEAD_OF_OPERATIONS", "M_AND_E",
    "SAFEGUARDING", "MARKETING_COMMS_MANAGER", "BUSINESS_DEVELOPMENT_MANAGER",
    "BUSINESS_DEVELOPMENT_ASSOCIATE", "HR_OFFICER", "FINANCE_ADMIN_OFFICER",
    "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT", "CAREER_DEVELOPMENT_OFFICER",
    "REGIONAL_HUB_LEAD",
  ]);

  const accessibleIds = departmentIds;

  const [alerts, weeklyReports, metricsCount, departmentCount] = await Promise.all([
    accessibleIds.length > 0
      ? prisma.alert.findMany({
          where: { resolved: false, entry: { departmentId: { in: accessibleIds } } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { entry: { select: { date: true, departmentId: true } } },
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.weeklyReport.findMany({
          where: { departmentId: { in: accessibleIds }, status: { in: ["DRAFT", "APPROVED"] } },
          orderBy: { weekStart: "desc" },
          take: 4,
          select: { generatedContent: true, weekStart: true, status: true, risks: true },
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.extractedMetric.count({
          where: { entry: { departmentId: { in: accessibleIds } } },
        })
      : Promise.resolve(0),
    Promise.resolve(accessibleIds.length),
  ]);

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Button
              component={Link}
              href="/submit"
              size="small"
              variant="contained"
              sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 2, py: 0.6 }}
            >
              Submit
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Insights</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            AI-generated analysis from your daily entries and extracted metrics.
          </Typography>
        </Box>

        {/* Summary cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 2, mb: 4 }}>
          {[
            { icon: <TrendingUpIcon />, label: "Metrics Extracted", value: metricsCount.toLocaleString(), sub: `${departmentCount} departments` },
            { icon: <WarningAmberIcon />, label: "Active Alerts", value: totalAlerts, sub: `${criticalAlerts} critical/high`, color: criticalAlerts > 0 ? "error" : "default" },
            { icon: <CheckCircleOutlineIcon />, label: "Weekly Reports", value: weeklyReports.length, sub: "Draft + Approved" },
            { icon: <LightbulbOutlinedIcon />, label: "Departments", value: departmentCount, sub: "With recent data" },
          ].map(({ label, value, sub, icon, color }) => (
            <Box key={label} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, color: "text.secondary" }}>
                <Box sx={{ fontSize: 18 }}>{icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>{label}</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: color === "error" ? "error.main" : "text.primary" }}>
                {typeof value === "number" ? value : value}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{sub}</Typography>
            </Box>
          ))}
        </Box>

        {/* Active alerts */}
        {alerts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Active Alerts</Typography>
            <Stack spacing={2}>
              {alerts.slice(0, 10).map((alert) => (
                <Box key={alert.id} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <WarningAmberIcon sx={{ fontSize: 18, color: alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "error.main" : "warning.main" }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{alert.type.replace(/_/g, " ")}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {new Date(alert.createdAt).toLocaleDateString()} · {alert.entry?.date ? new Date(alert.entry.date).toLocaleDateString() : "Unknown date"}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Chip label={alert.severity} size="small" color={alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "error" : "warning"} sx={{ fontSize: "0.625rem" }} />
                      <Chip label="View" size="small" component={Link} href="/interventions" sx={{ fontSize: "0.625rem", cursor: "pointer" }} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* AI-Generated weekly report previews */}
        {weeklyReports.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Weekly Report Previews</Typography>
            <Stack spacing={3}>
              {weeklyReports.map((report) => {
                const content = report.generatedContent as { narrative?: string; summary?: string } | null;
                return (
                  <Box key={report.weekStart.toString()} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Week of {new Date(report.weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </Typography>
                      <Chip label={report.status} size="small" color={report.status === "APPROVED" ? "success" : "warning"} sx={{ fontSize: "0.625rem" }} />
                    </Box>
                    {content?.narrative ? (
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                        {content.narrative.slice(0, 300)}{content.narrative.length > 300 ? "..." : ""}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.disabled" }}>
                        No narrative generated yet.
                      </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Button size="small" component={Link} href="/reports" sx={{ fontSize: "0.75rem", textTransform: "none" }}>
                        View full report →
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Empty state */}
        {totalAlerts === 0 && weeklyReports.length === 0 && metricsCount === 0 && (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <LightbulbOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: "text.secondary" }}>No insights generated yet</Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
              Start submitting daily entries to generate AI-powered insights.
            </Typography>
            <Button component={Link} href="/submit" variant="contained" sx={{ mt: 3 }}>
              Submit First Report
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}