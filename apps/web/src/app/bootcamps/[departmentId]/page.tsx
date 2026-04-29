import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { prisma } from "@orgos/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getBootcampDashboardData } from "@/modules/dashboards/bootcamp/queries";
import type { Alert } from "@orgos/db";

interface Props {
  params: Promise<{ departmentId: string }>;
}

function daysSince(date: Date | null): string {
  if (!date) return "No entries";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function latestString(data: Record<string, unknown[]> | null, key: string): string | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "string" ? val : null;
}

export default async function BootcampDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "BOOTCAMP_MANAGER" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "PROGRAM_MANAGER") redirect(`/programs/${sessionUser.departmentId}`);
    else if (role === "COUNTRY_DIRECTOR") redirect("/country");
    else redirect("/coming-soon");
  }

  const bootcamp = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  if (!bootcamp) notFound();

  const { hubs, hubLeads, latestSnapshot, lastEntries, alerts } =
    await getBootcampDashboardData(departmentId);

  const hubLeadMap = new Map(hubLeads.map((hl) => [hl.departmentId, hl.name]));
  const lastEntryMap = new Map(lastEntries.map((e) => [e.departmentId, e.date]));

  // Rolled-up strip totals
  let totalAttendance = 0;
  let totalDropouts = 0;
  let hubsWithData = 0;
  for (const hub of hubs) {
    const snap = latestSnapshot.get(hub.id);
    const data = snap?.data as Record<string, unknown[]> | null;
    const att = latestMetric(data, "attendance_rate");
    const drop = latestMetric(data, "dropout_count");
    if (att !== null) { totalAttendance += att; hubsWithData++; }
    if (drop !== null) totalDropouts += drop;
  }
  const avgAttendance = hubsWithData > 0 ? `${(totalAttendance / hubsWithData * 100).toFixed(0)}%` : "—";

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
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{bootcamp.name}</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Hubs", value: String(hubs.length) },
            { label: "Avg Attendance", value: avgAttendance },
            { label: "Total Dropouts", value: String(totalDropouts) },
            { label: "Active Alerts", value: String(alerts.length) },
          ].map(({ label, value }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
                <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Hubs</Typography>
            <Grid container spacing={2}>
              {hubs.map((hub) => {
                const snap = latestSnapshot.get(hub.id);
                const data = snap?.data as Record<string, unknown[]> | null;
                const att = latestMetric(data, "attendance_rate");
                const drop = latestMetric(data, "dropout_count");
                const eng = latestString(data, "engagement_score");
                const lastDate = lastEntryMap.get(hub.id) ?? null;
                const hubLead = hubLeadMap.get(hub.id) ?? "—";
                const engColor = eng === "HIGH" ? "success.main" : eng === "LOW" ? "error.main" : "warning.main";
                return (
                  <Grid key={hub.id} size={{ xs: 12 }}>
                    <Box
                      component={Link}
                      href={`/departments/${hub.id}`}
                      sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{hub.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Lead: {hubLead}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>{daysSince(lastDate)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 3 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Attendance</Typography>
                          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>{att !== null ? `${(att * 100).toFixed(0)}%` : "—"}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Dropouts</Typography>
                          <Typography variant="body2" sx={{ color: drop ? "error.main" : "text.primary", fontWeight: 600 }}>{drop ?? "—"}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Engagement</Typography>
                          <Typography variant="body2" sx={{ color: eng ? engColor : "text.secondary", fontWeight: 600 }}>{eng ?? "—"}</Typography>
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
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
