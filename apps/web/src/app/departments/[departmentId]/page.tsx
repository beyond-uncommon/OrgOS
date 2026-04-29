import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { getDepartmentDashboard, getRecentAlerts, getWeeklyInsightSnapshot } from "@/modules/dashboards/queries";
import { getPendingActionsForDepartment, getApproverByEmail } from "@/modules/approvals/queries";
import { getDepartmentInstructors } from "@/modules/dashboards/instructor/queries";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@orgos/db";
import { UserBar } from "@/components/UserBar";
import { MetricsStrip } from "@/modules/dashboards/department/MetricsStrip";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { InsightNarrativePanel } from "@/modules/dashboards/department/InsightNarrativePanel";
import { ApprovalQueuePanel } from "@/modules/dashboards/department/ApprovalQueuePanel";
import type { InsightReport } from "@orgos/shared-types";
import type { Alert } from "@orgos/db";

const DEMO_APPROVER_EMAIL = "hublead@uncommon.org";

interface Props {
  params: Promise<{ departmentId: string }>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="p" variant="overline" sx={{ color: "text.secondary", mb: 2 }}>
      {children}
    </Typography>
  );
}

export default async function DepartmentDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  // sessionUser is guaranteed non-null after redirect above
  const user = sessionUser!;
  const role = user.role;

  if (role === "INSTRUCTOR") {
    const { redirect } = await import("next/navigation");
    redirect(`/departments/${departmentId}/instructors/${user.id}`);
  }

  if (role !== "HUB_LEAD" && role !== "ADMIN") {
    const { redirect } = await import("next/navigation");
    if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${user.departmentId}`);
    else if (role === "PROGRAM_MANAGER") redirect(`/programs/${user.departmentId}`);
    else if (role === "COUNTRY_DIRECTOR") redirect("/country");
    else redirect("/coming-soon");
  }

  const [dailySnapshot, weeklySnapshot, rawAlerts, pendingActions, approver, instructors, dept] = await Promise.all([
    getDepartmentDashboard(departmentId),
    getWeeklyInsightSnapshot(departmentId),
    getRecentAlerts(departmentId),
    getPendingActionsForDepartment(departmentId),
    getApproverByEmail(DEMO_APPROVER_EMAIL),
    getDepartmentInstructors(departmentId),
    prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }),
  ]);

  const metricsData = dailySnapshot?.data as Record<string, unknown[]> | null;
  const insightReport = weeklySnapshot?.data as InsightReport | null;
  const alerts = rawAlerts as Alert[];
  const hasRisks = alerts.length > 0;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Top bar */}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {dept?.name ?? "Hub Dashboard"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
              {hasRisks && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.1)",
                    border: "1px solid",
                    borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.25)",
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "error.main",
                      boxShadow: "0 0 6px var(--mui-palette-error-main)",
                    }}
                  />
                  <Typography variant="overline" sx={{ color: "error.main" }}>
                    {alerts.length} Active Risk{alerts.length !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Main content — 8 columns */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Metrics strip */}
            <Box sx={{ mb: 4 }}>
              <SectionLabel>Today's Operational Metrics</SectionLabel>
              {metricsData ? (
                <MetricsStrip data={metricsData} />
              ) : (
                <EmptyState message="No metrics snapshot available. Submit entries to populate." />
              )}
            </Box>

            {/* Weekly intelligence */}
            <Box
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid",
                  borderBottomColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    boxShadow: "0 0 8px var(--mui-palette-primary-main)",
                  }}
                />
                <Typography variant="overline" sx={{ color: "primary.main" }}>
                  Weekly Intelligence Report
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                {insightReport ? (
                  <InsightNarrativePanel report={insightReport} />
                ) : (
                  <EmptyState message="No weekly insight generated yet. Submit entries to trigger analysis." />
                )}
              </Box>
            </Box>

            {/* Instructors */}
            <Box sx={{ mt: 4 }}>
              <SectionLabel>Instructors ({instructors.length})</SectionLabel>
              <Grid container spacing={2}>
                {instructors.map((instructor) => (
                  <Grid key={instructor.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      component={Link}
                      href={`/departments/${departmentId}/instructors/${instructor.id}`}
                      sx={{
                        display: "block",
                        textDecoration: "none",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        px: 2.5,
                        py: 2,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 0 0 3px rgb(var(--mui-palette-primary-mainChannel) / 0.08)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 1.5,
                        }}
                      >
                        <Typography variant="overline" sx={{ color: "primary.main", lineHeight: 1 }}>
                          {instructor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
                        {instructor.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {instructor.email}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Right sidebar — 4 columns */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Risk signals */}
              <Box>
                <SectionLabel>Risk Signals</SectionLabel>
                <RisksPanel alerts={alerts} />
              </Box>

              {/* Approval queue */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid",
                    borderBottomColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    Pending Approvals
                  </Typography>
                  {pendingActions.length > 0 && (
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.contrastText" }}>
                        {pendingActions.length}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 3 }}>
                  <ApprovalQueuePanel
                    actions={pendingActions}
                    approverId={approver?.id ?? ""}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>{message}</Typography>
    </Box>
  );
}
