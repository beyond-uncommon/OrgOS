import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Box, Container, Typography, Chip, Alert, Divider } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { UserBar } from "@/components/UserBar";
import { prisma, SnapshotScope, PeriodType } from "@orgos/db";
import type { Alert as AlertType, Intervention } from "@orgos/db";
import { RiskCard } from "@orgos/ui";

const EXECUTIVE_ROLES = ["COUNTRY_DIRECTOR", "ADMIN"];

interface OrgInsight {
  departmentId: string;
  summary: string;
  risks: { category: string; severity: string; description: string }[];
  insights: { type: string; severity: string; description: string }[];
  recommendations: string[];
  confidence: number;
}

interface OrgSnapshot {
  periodStart: Date;
  data: {
    summary?: string;
    risks?: { category: string; severity: string; description: string }[];
    insights?: { type: string; severity: string; description: string }[];
    recommendations?: string[];
    confidence?: number;
  };
}

function metricFromSnapshot(snap: OrgSnapshot | undefined, key: string): number | null {
  if (!snap?.data) return null;
  const arr = (snap.data as Record<string, unknown[]>)[key];
  if (!Array?.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

export default async function ExecutivePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (!EXECUTIVE_ROLES.includes(sessionUser.role)) {
    if (sessionUser.role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (sessionUser.role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else redirect("/coming-soon");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [orgSnapshot, activeAlerts, openInterventions, recentReports] = await Promise.all([
    prisma.dashboardSnapshot.findFirst({
      where: { scope: SnapshotScope.ORGANIZATION, periodType: PeriodType.MONTHLY },
      orderBy: { periodStart: "desc" },
    }),
    prisma.alert.findMany({
      where: { resolved: false },
      orderBy: { severity: "desc", createdAt: "desc" },
      take: 20,
      include: { entry: { select: { departmentId: true } } },
    }),
    prisma.intervention.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { assignedTo: { select: { name: true } }, alert: { select: { type: true } } },
    }),
    prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { department: { select: { name: true } } },
    }),
  ]);

  const hubs = await prisma.department.findMany({
    where: { parent: { isNot: null } },
    select: { id: true, name: true },
  });

  const allHubIds = hubs.map(h => h.id);
  const latestSnapshots = await prisma.dashboardSnapshot.findMany({
    where: { departmentId: { in: allHubIds }, periodType: PeriodType.DAILY },
    orderBy: { periodStart: "desc" },
  });

  const deptSnapshots = new Map<string, OrgSnapshot>();
  for (const s of latestSnapshots) {
    if (s.departmentId && !deptSnapshots.has(s.departmentId)) {
      deptSnapshots.set(s.departmentId, s as OrgSnapshot);
    }
  }

  const data = orgSnapshot?.data as OrgSnapshot["data"] | undefined;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{
        borderBottom: "1px solid",
        borderBottomColor: "divider",
        bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Executive Snapshot
              </Typography>
              {data?.confidence !== undefined && (
                <Chip
                  label={`${Math.round((data.confidence as number) * 100)}% confidence`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem" }}
                />
              )}
            </Box>
            <UserBar name={sessionUser.name} role={sessionUser.role} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Summary Banner */}
        {data?.summary && (
          <Box sx={{ mb: 4, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
              AI-Generated Summary
            </Typography>
            <Typography variant="body1" sx={{ color: "text.primary", lineHeight: 1.7 }}>
              {data.summary as string}
            </Typography>
          </Box>
        )}

        {/* KPI Row */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Active Alerts", value: activeAlerts.length, color: activeAlerts.length > 5 ? "error" : activeAlerts.length > 0 ? "warning" : "success" },
            { label: "Open Interventions", value: openInterventions.length, color: openInterventions.length > 0 ? "warning" : "success" },
            { label: "Hubs Monitored", value: hubs.length },
            { label: "Daily Reports (7d)", value: recentReports.length },
          ].map(({ label, value, color }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                <Typography
                  variant="h4"
                  sx={{
                    color: color === "error" ? "error.main" : color === "warning" ? "warning.main" : color === "success" ? "success.main" : "text.primary",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Risks & Insights */}
          <Grid size={{ xs: 12, md: 8 }}>
            {data?.risks && (data.risks as { severity: string; category: string; description: string }[]).length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Org-Wide Risk Signals
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {(data.risks as { severity: string; category: string; description: string }[]).map((risk, i) => (
                    <Box
                      key={i}
                      sx={{
                        border: "1px solid",
                        borderColor: risk.severity === "CRITICAL" || risk.severity === "HIGH"
                          ? "rgb(var(--mui-palette-error-mainChannel) / 0.3)"
                          : "divider",
                        borderRadius: 2,
                        p: 2,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Chip
                          label={risk.category}
                          size="small"
                          color={risk.severity === "CRITICAL" ? "error" : risk.severity === "HIGH" ? "warning" : "info"}
                          sx={{ fontSize: "0.6rem" }}
                        />
                        <Chip label={risk.severity} size="small" variant="outlined" sx={{ fontSize: "0.6rem" }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {risk.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {data?.insights && (data.insights as { type: string; severity: string; description: string }[]).length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Key Insights
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(data.insights as { type: string; severity: string; description: string }[]).map((insight, i) => (
                    <Box
                      key={i}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: 2,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                          {insight.type}
                        </Typography>
                        <Chip
                          label={insight.severity}
                          size="small"
                          color={insight.severity === "HIGH" ? "warning" : insight.severity === "MEDIUM" ? "info" : "default"}
                          sx={{ fontSize: "0.6rem" }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {insight.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Hub Snapshot Table */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Hub Performance — Latest Snapshot
              </Typography>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>
                {hubs.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>No hubs configured.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0, minWidth: 500 }}>
                      <Box sx={{ p: 1.5, fontWeight: 600, fontSize: "0.75rem", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>Hub</Box>
                      <Box sx={{ p: 1.5, fontWeight: 600, fontSize: "0.75rem", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>Attendance</Box>
                      <Box sx={{ p: 1.5, fontWeight: 600, fontSize: "0.75rem", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>Dropouts</Box>
                      <Box sx={{ p: 1.5, fontWeight: 600, fontSize: "0.75rem", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>Engagement</Box>
                      <Box sx={{ p: 1.5, fontWeight: 600, fontSize: "0.75rem", borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>Blockers</Box>
                      {hubs.map((hub, i) => {
                        const snap = deptSnapshots.get(hub.id);
                        const att = metricFromSnapshot(snap, "attendance_rate");
                        const drop = metricFromSnapshot(snap, "dropout_count");
                        const eng = metricFromSnapshot(snap, "engagement_score");
                        const block = metricFromSnapshot(snap, "blocker_present");
                        return (
                          <Box key={hub.id} sx={{
                            display: "contents",
                            "& > *": { borderBottom: i < hubs.length - 1 ? "1px solid" : "none", borderColor: "divider" },
                          }}>
                            <Box sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8rem" }}>{hub.name}</Typography>
                            </Box>
                            <Box sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: att !== null && att < 0.8 ? "warning.main" : "text.primary" }}>
                                {att !== null ? `${(att * 100).toFixed(0)}%` : "—"}
                              </Typography>
                            </Box>
                            <Box sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: drop !== null && drop > 2 ? "error.main" : "text.primary" }}>
                                {drop !== null ? drop : "—"}
                              </Typography>
                            </Box>
                            <Box sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: eng === 0 ? "warning.main" : "text.primary" }}>
                                {eng !== null ? (eng === 2 ? "LOW" : eng === 1 ? "MED" : "HIGH") : "—"}
                              </Typography>
                            </Box>
                            <Box sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: block === 1 ? "error.main" : "text.secondary" }}>
                                {block === 1 ? "Yes" : block === 0 ? "No" : "—"}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Recommendations */}
            {data?.recommendations && (data.recommendations as string[])?.length > 0 && (
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  AI Recommendations
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(data.recommendations as string[]).map((rec, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                        {i + 1}
                      </Box>
                      <Typography variant="body2" sx={{ color: "text.primary", pt: 0.3 }}>{rec}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Grid>

          {/* Sidebar: Alerts + Interventions */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Active Alerts ({activeAlerts.length})
              </Typography>
              {activeAlerts.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>All clear — no active alerts</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {activeAlerts.slice(0, 10).map((alert) => (
                    <Box
                      key={alert.id}
                      component={Link}
                      href={`/departments/${alert.entry?.departmentId ?? ""}`}
                      sx={{
                        display: "block",
                        textDecoration: "none",
                        p: 1.5,
                        border: "1px solid",
                        borderColor: alert.severity === "CRITICAL" || alert.severity === "HIGH"
                          ? "rgb(var(--mui-palette-error-mainChannel) / 0.25)"
                          : "divider",
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Chip label={alert.type} size="small" color={alert.severity === "CRITICAL" ? "error" : alert.severity === "HIGH" ? "warning" : "info"} sx={{ fontSize: "0.55rem" }} />
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>
                          {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        ID: {alert.id.slice(0, 8)}...
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Open Interventions ({openInterventions.length})
              </Typography>
              {openInterventions.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>No open interventions</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {openInterventions.map((iv: Intervention & { assignedTo: { name: string }; alert: { type: string } }) => (
                    <Box key={iv.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.75rem" }}>
                          {iv.issueType}
                        </Typography>
                        <Chip label={iv.status} size="small" color={iv.status === "IN_PROGRESS" ? "info" : "warning"} sx={{ fontSize: "0.55rem" }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Assigned to {iv.assignedTo.name} · {iv.alert.type}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}