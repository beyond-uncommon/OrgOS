import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography, Chip } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { prisma } from "@orgos/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import {
  getProgramDashboardData,
  getYCProgramData,
  getProgramWeeklyReports,
  detectProgramType,
} from "@/modules/dashboards/program/queries";
import type { Alert } from "@orgos/db";

interface Props {
  params: Promise<{ departmentId: string }>;
}

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function statusColor(status: string): "default" | "warning" | "success" | "info" {
  if (status === "DRAFT") return "warning";
  if (status === "APPROVED" || status === "PUBLISHED") return "success";
  if (status === "UNDER_REVIEW") return "info";
  return "default";
}

export default async function ProgramDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
  if (role === "PROGRAM_MANAGER") redirect("/programs");
  if (role === "YOUTH_CODING_MANAGER") redirect("/youth-coding");
  if (!["ADMIN", "COUNTRY_DIRECTOR", "TEACHER_TRAINING_COORDINATOR"].includes(role)) {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else redirect("/coming-soon");
  }

  const program = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  if (!program) notFound();

  const programType = detectProgramType(program.name);

  // Fetch data based on program type
  const [programData, ycData, weeklyReports] = await Promise.all([
    programType === "BOOTCAMP" ? getProgramDashboardData(departmentId) : Promise.resolve(null),
    programType === "YOUTH_CODING" ? getYCProgramData(departmentId) : Promise.resolve(null),
    programType !== "BOOTCAMP" && programType !== "YOUTH_CODING"
      ? getProgramWeeklyReports(departmentId)
      : Promise.resolve([]),
  ]);

  const ycWeeklyReports = ycData?.weeklyReports ?? [];
  const genericWeeklyReports = weeklyReports;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{program.name}</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* ── YOUTH CODING ─────────────────────────────────── */}
        {programType === "YOUTH_CODING" && ycData && (
          <>
            {/* Metrics */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {[
                { label: "Registered Students", value: String(ycData.metrics.totalRegistered) },
                { label: "Taught YTD", value: String(ycData.metrics.taughtYTD) },
                { label: "Average Age", value: ycData.metrics.averageAge ? String(ycData.metrics.averageAge) : "—" },
                { label: "Hubs", value: String(ycData.hubs.length) },
                { label: "Schools", value: String(ycData.metrics.schoolCount) },
                { label: "Communities", value: String(ycData.metrics.communityCount) },
              ].map(({ label, value }) => (
                <Grid key={label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper" }}>
                    <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                    <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Gender breakdown */}
            {ycData.metrics.genderBreakdown.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>Gender Breakdown</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {ycData.metrics.genderBreakdown.map(g => (
                    <Box key={g.gender} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.5, bgcolor: "background.paper" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : g.gender}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>{g.count}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Hubs */}
            {ycData.hubs.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>Hubs</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {ycData.hubs.map(hub => (
                    <Box
                      key={hub.id}
                      component={Link}
                      href={`/departments/${hub.id}`}
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2.5, py: 1.5, textDecoration: "none", color: "text.primary", "&:hover": { borderColor: "primary.main" } }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{hub.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Weekly Reports */}
            <WeeklyReportsSection reports={ycWeeklyReports} />
          </>
        )}

        {/* ── BOOTCAMP ─────────────────────────────────────── */}
        {programType === "BOOTCAMP" && programData && (
          <>
            {(() => {
              const allHubs = [...programData.hubsByBootcamp.values()].flat();
              let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
              for (const hub of allHubs) {
                const data = programData.latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
                const att = latestMetric(data, "attendance_rate");
                const drop = latestMetric(data, "dropout_count");
                if (att !== null) { totalAtt += att; hubsWithAtt++; }
                if (drop !== null) totalDropouts += drop;
              }
              const avgAtt = hubsWithAtt > 0 ? `${(totalAtt / hubsWithAtt * 100).toFixed(0)}%` : "—";
              const managerMap = new Map(programData.bootcampManagers.map((m) => [m.departmentId, m.name]));

              return (
                <>
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                      { label: "Bootcamps", value: String(programData.bootcamps.length) },
                      { label: "Total Hubs", value: String(allHubs.length) },
                      { label: "Avg Attendance", value: avgAtt },
                      { label: "Active Alerts", value: String(programData.alerts.length) },
                    ].map(({ label, value }) => (
                      <Grid key={label} size={{ xs: 6, md: 3 }}>
                        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                          <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                          <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Bootcamps</Typography>
                      <Grid container spacing={2}>
                        {programData.bootcamps.map((bootcamp) => {
                          const hubs = programData.hubsByBootcamp.get(bootcamp.id) ?? [];
                          const manager = managerMap.get(bootcamp.id) ?? "—";
                          let bAtt = 0; let bHubs = 0; let bDropouts = 0;
                          for (const hub of hubs) {
                            const data = programData.latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
                            const att = latestMetric(data, "attendance_rate");
                            const drop = latestMetric(data, "dropout_count");
                            if (att !== null) { bAtt += att; bHubs++; }
                            if (drop !== null) bDropouts += drop;
                          }
                          const bAvgAtt = bHubs > 0 ? `${(bAtt / bHubs * 100).toFixed(0)}%` : "—";
                          return (
                            <Grid key={bootcamp.id} size={{ xs: 12 }}>
                              <Box
                                component={Link}
                                href={`/bootcamps/${bootcamp.id}`}
                                sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{bootcamp.name}</Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Manager: {manager}</Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{hubs.length} hub{hubs.length !== 1 ? "s" : ""}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 3 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Avg Attendance</Typography>
                                    <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>{bAvgAtt}</Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Dropouts</Typography>
                                    <Typography variant="body2" sx={{ color: bDropouts > 0 ? "error.main" : "text.primary", fontWeight: 600 }}>{bDropouts}</Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Active Alerts</Typography>
                      <RisksPanel alerts={programData.alerts as Alert[]} />
                    </Grid>
                  </Grid>

                  <WeeklyReportsSection reports={[]} />
                </>
              );
            })()}
          </>
        )}

        {/* ── OUTREACH / TEACHER TRAINING / UNKNOWN ─────── */}
        {(programType === "OUTREACH" || programType === "TEACHER_TRAINING" || programType === "UNKNOWN") && (
          <>
            <Box sx={{ mb: 4, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Operational data collection for {program.name} is coming soon. Weekly reports are available below.
              </Typography>
            </Box>
            <WeeklyReportsSection reports={genericWeeklyReports} />
          </>
        )}

      </Container>
    </Box>
  );
}

function WeeklyReportsSection({ reports }: { reports: { id: string; weekStart: Date; weekEnd: Date; status: string; generatedContent: unknown }[] }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Weekly Reports</Typography>
      {reports.length === 0 ? (
        <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No weekly reports generated yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {reports.map(r => {
            const content = r.generatedContent as Record<string, unknown> | null;
            const summary = typeof content?.summary === "string" ? content.summary : null;
            const highlights = Array.isArray(content?.highlights) ? content.highlights as string[] : [];
            return (
              <Box key={r.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: summary || highlights.length ? 1.5 : 0 }}>
                  <Typography variant="subtitle2">
                    Week of {new Date(r.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" "}–{" "}
                    {new Date(r.weekEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </Typography>
                  <Chip label={r.status} size="small" color={statusColor(r.status)} />
                </Box>
                {summary && (
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: highlights.length ? 1 : 0 }}>{summary}</Typography>
                )}
                {highlights.length > 0 && (
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {highlights.slice(0, 3).map((h, i) => (
                      <Typography key={i} component="li" variant="caption" sx={{ color: "text.secondary" }}>{h}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
