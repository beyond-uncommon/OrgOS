import { redirect } from "next/navigation";
import { Box, Container, Typography, Chip } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getAllProgramsData } from "@/modules/dashboards/program/queries";
import type { Alert } from "@orgos/db";

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

export default async function ProgramsOverviewPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  const allowed = new Set(["PROGRAM_MANAGER", "ADMIN", "COUNTRY_DIRECTOR", "YOUTH_CODING_MANAGER", "TEACHER_TRAINING_COORDINATOR"]);
  if (!allowed.has(role)) {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else redirect("/coming-soon");
  }

  const allData = await getAllProgramsData();
  const { ycData, bootcampData, ttReports, outreachReports } = allData;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Program Overview</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* ── YOUTH CODING ─────────────────────────────────── */}
        {ycData && (
          <>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Youth Coding</Typography>
              <Chip label="Program" size="small" color="primary" />
            </Box>

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

            <Box sx={{ mb: 5 }}>
              <WeeklyReportsSection
                reports={ycData.weeklyReports.map(r => ({
                  ...r,
                  weekStart: new Date(r.weekStart),
                  weekEnd: new Date(r.weekEnd),
                }))}
              />
            </Box>
          </>
        )}

        {/* ── BOOTCAMP ─────────────────────────────────────── */}
        {bootcampData && (
          <>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Bootcamp</Typography>
              <Chip label="Program" size="small" color="secondary" />
            </Box>

            {(() => {
              const allHubs = [...bootcampData.hubsByBootcamp.values()].flat();
              let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
              for (const hub of allHubs) {
                const data = bootcampData.latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
                const att = latestMetric(data, "attendance_rate");
                const drop = latestMetric(data, "dropout_count");
                if (att !== null) { totalAtt += att; hubsWithAtt++; }
                if (drop !== null) totalDropouts += drop;
              }
              const avgAtt = hubsWithAtt > 0 ? `${(totalAtt / hubsWithAtt * 100).toFixed(0)}%` : "—";
              const managerMap = new Map(bootcampData.bootcampManagers.map(m => [m.departmentId, m.name]));

              return (
                <>
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                      { label: "Bootcamps", value: String(bootcampData.bootcamps.length) },
                      { label: "Total Hubs", value: String(allHubs.length) },
                      { label: "Avg Attendance", value: avgAtt },
                      { label: "Active Alerts", value: String(bootcampData.alerts.length) },
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
                        {bootcampData.bootcamps.map(bootcamp => {
                          const hubs = bootcampData.hubsByBootcamp.get(bootcamp.id) ?? [];
                          const manager = managerMap.get(bootcamp.id) ?? "—";
                          let bAtt = 0; let bHubs = 0; let bDropouts = 0;
                          for (const hub of hubs) {
                            const data = bootcampData.latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
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
                      <RisksPanel alerts={bootcampData.alerts as Alert[]} />
                    </Grid>
                  </Grid>
                </>
              );
            })()}
          </>
        )}

        {/* ── TEACHER TRAINING ─────────────────────────────── */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Teacher Training</Typography>
            <Chip label="Program" size="small" color="success" />
          </Box>

          <Box sx={{ mb: 3, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Operational data collection for Teacher Training is coming soon.
            </Typography>
          </Box>

          <WeeklyReportsSection reports={ttReports.map(r => ({ ...r, weekStart: new Date(r.weekStart), weekEnd: new Date(r.weekEnd) }))} />
        </Box>

        {/* ── OUTREACH ─────────────────────────────────────── */}
        <Box>
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Outreach</Typography>
            <Chip label="Program" size="small" color="info" />
          </Box>

          <Box sx={{ mb: 3, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Operational data collection for Outreach is coming soon.
            </Typography>
          </Box>

          <WeeklyReportsSection reports={outreachReports.map(r => ({ ...r, weekStart: new Date(r.weekStart), weekEnd: new Date(r.weekEnd) }))} />
        </Box>

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
