import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { prisma } from "@orgos/db";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getProgramDashboardData } from "@/modules/dashboards/program/queries";
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

export default async function ProgramDashboardPage({ params }: Props) {
  const { departmentId } = await params;

  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "PROGRAM_MANAGER" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
    else if (role === "COUNTRY_DIRECTOR") redirect("/country");
    else redirect("/coming-soon");
  }

  const program = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true },
  });
  if (!program) notFound();

  const { bootcamps, bootcampManagers, hubsByBootcamp, latestSnapshot, alerts } =
    await getProgramDashboardData(departmentId);

  const managerMap = new Map(bootcampManagers.map((m) => [m.departmentId, m.name]));

  const allHubs = [...hubsByBootcamp.values()].flat();
  let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
  for (const hub of allHubs) {
    const data = latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
    const att = latestMetric(data, "attendance_rate");
    const drop = latestMetric(data, "dropout_count");
    if (att !== null) { totalAtt += att; hubsWithAtt++; }
    if (drop !== null) totalDropouts += drop;
  }
  const avgAtt = hubsWithAtt > 0 ? `${(totalAtt / hubsWithAtt * 100).toFixed(0)}%` : "—";

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
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{program.name}</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Bootcamps", value: String(bootcamps.length) },
            { label: "Total Hubs", value: String(allHubs.length) },
            { label: "Avg Attendance", value: avgAtt },
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
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Bootcamps</Typography>
            <Grid container spacing={2}>
              {bootcamps.map((bootcamp) => {
                const hubs = hubsByBootcamp.get(bootcamp.id) ?? [];
                const manager = managerMap.get(bootcamp.id) ?? "—";
                let bAtt = 0; let bHubs = 0; let bDropouts = 0;
                for (const hub of hubs) {
                  const data = latestSnapshot.get(hub.id)?.data as Record<string, unknown[]> | null;
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
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
