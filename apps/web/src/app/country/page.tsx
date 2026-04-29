import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";
import { RisksPanel } from "@/modules/dashboards/department/RisksPanel";
import { getCountryDashboardData } from "@/modules/dashboards/country/queries";
import type { Alert } from "@orgos/db";

function latestMetric(data: Record<string, unknown[]> | null, key: string): number | null {
  if (!data) return null;
  const arr = data[key];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

export default async function CountryDirectorPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const role = sessionUser.role;
  if (role !== "COUNTRY_DIRECTOR" && role !== "ADMIN") {
    if (role === "INSTRUCTOR") redirect(`/departments/${sessionUser.departmentId}/instructors/${sessionUser.id}`);
    else if (role === "HUB_LEAD") redirect(`/departments/${sessionUser.departmentId}`);
    else if (role === "BOOTCAMP_MANAGER") redirect(`/bootcamps/${sessionUser.departmentId}`);
    else if (role === "PROGRAM_MANAGER") redirect(`/programs/${sessionUser.departmentId}`);
    else redirect("/coming-soon");
  }

  const { programs, programManagers, bootcamps, hubs, latestSnapshot, alerts, studentCount } =
    await getCountryDashboardData();

  const managerMap = new Map(programManagers.map((m) => [m.departmentId, m.name]));

  let totalAtt = 0; let hubsWithAtt = 0; let totalDropouts = 0;
  for (const hub of hubs) {
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
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Country Overview</Typography>
            </Box>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: "Active Students", value: String(studentCount) },
            { label: "Org Attendance", value: avgAtt },
            { label: "Dropouts (Latest)", value: String(totalDropouts) },
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
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Programs</Typography>
            <Grid container spacing={2}>
              {programs.map((program) => {
                const programBootcamps = bootcamps.filter((b) => b.parentDepartmentId === program.id);
                const manager = managerMap.get(program.id) ?? "—";
                return (
                  <Grid key={program.id} size={{ xs: 12 }}>
                    <Box
                      component={Link}
                      href={`/programs/${program.id}`}
                      sx={{ display: "block", textDecoration: "none", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.15s" }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: "text.primary" }}>{program.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Manager: {manager}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{programBootcamps.length} bootcamp{programBootcamps.length !== 1 ? "s" : ""}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Org-Wide Alerts</Typography>
            <RisksPanel alerts={alerts as Alert[]} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
