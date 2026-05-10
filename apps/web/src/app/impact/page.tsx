import { prisma } from "@orgos/db";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";

export const revalidate = 3600;

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

export default async function ImpactPage() {
  const org = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true, name: true },
  });

  const [programs, totalStudents, fundingRecords, ycDemographics, schoolCount, communityCount] = await Promise.all([
    org
      ? prisma.department.findMany({
          where: { parentDepartmentId: org.id },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
    prisma.fundingRecord.findMany({ orderBy: { receivedAt: "asc" } }),
    prisma.student.groupBy({
      by: ["gender"],
      where: { enrollmentStatus: "ACTIVE", gender: { not: null } },
      _count: true,
    }),
    prisma.student.findMany({ where: { school: { not: null }, enrollmentStatus: "ACTIVE" }, select: { school: true }, distinct: ["school"] }),
    prisma.student.findMany({ where: { community: { not: null }, enrollmentStatus: "ACTIVE" }, select: { community: true }, distinct: ["community"] }),
  ]);
  const programIds = programs.map(p => p.id);
  const bootcampIds = (await prisma.department.findMany({
    where: { parentDepartmentId: { in: programIds } },
    select: { id: true },
  })).map(b => b.id);

  const totalFunding = fundingRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalHubs = await prisma.department.count({
    where: { parentDepartmentId: { in: [...programIds, ...bootcampIds] } },
  });

  const ycStudentCount = programs.find(p => p.name.toLowerCase().includes("youth coding"))
    ? await prisma.student.count({
        where: { enrollmentStatus: "ACTIVE", department: { parentDepartmentId: "prog-yc" } },
      })
    : 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* Header */}
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", mb: 2 }}>
            Our Impact
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9, maxWidth: 600 }}>
            Real-time metrics from every program, every hub, every day.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>

        {/* Key metrics */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {[
            { label: "Total Students", value: totalStudents.toLocaleString(), color: "primary.main" },
            { label: "Programs", value: String(programs.length), color: "secondary.main" },
            { label: "Active Hubs", value: String(totalHubs), color: "success.main" },
            { label: "Total Funding YTD", value: totalFunding ? formatCurrency(totalFunding) : "—", color: "warning.main" },
          ].map(({ label, value, color }) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center" }}>
                <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", color, mb: 0.5 }}>
                  {value}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Programs */}
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em", mb: 3 }}>
          Programs
        </Typography>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {programs.map(program => {
            const progFunding = fundingRecords
              .filter(r => r.programId === program.id)
              .reduce((s, r) => s + r.amount, 0);
            return (
              <Grid key={program.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", height: "100%" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    {program.name}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {program.name.toLowerCase().includes("youth coding") && (
                      <MetricRow label="Students" value={ycStudentCount.toLocaleString()} />
                    )}
                    {program.name.toLowerCase().includes("bootcamp") && (
                      <MetricRow label="Bootcamps" value={String(bootcampIds.length)} />
                    )}
                    {program.name.toLowerCase().includes("teacher training") && (
                      <MetricRow label="Teachers Trained" value="—" />
                    )}
                    {program.name.toLowerCase().includes("outreach") && (
                      <MetricRow label="Communities Reached" value="—" />
                    )}
                    {progFunding > 0 && <MetricRow label="Funding" value={formatCurrency(progFunding)} />}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Demographics */}
        {ycDemographics.length > 0 && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em", mb: 3 }}>
              Demographics
            </Typography>
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
                    Gender Distribution
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {ycDemographics
                      .filter((g): g is typeof g & { gender: string } => g.gender !== null)
                      .map(g => (
                        <Box key={g.gender} sx={{ textAlign: "center" }}>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {g._count}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : g.gender}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
                    Youth Coding Students
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {[
                      { label: "Registered", value: ycStudentCount },
                      { label: "Schools", value: schoolCount.length },
                      { label: "Communities", value: communityCount.length },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ textAlign: "center" }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>{value.toLocaleString()}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </>
        )}

        {/* Funding breakdown */}
        {fundingRecords.length > 0 && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em", mb: 3 }}>
              Funding Sources
            </Typography>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", overflow: "hidden" }}>
              {fundingRecords.map(r => (
                <Box
                  key={r.id}
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.source}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {r.description}{r.receivedAt ? ` · ${new Date(r.receivedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main", flexShrink: 0, ml: 2 }}>
                    {formatCurrency(r.amount)}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ display: "flex", justifyContent: "space-between", px: 3, py: 2.5, bgcolor: "grey.100" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Total</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>
                  {formatCurrency(totalFunding)}
                </Typography>
              </Box>
            </Box>
          </>
        )}

        {/* Footer */}
        <Box sx={{ mt: 8, pt: 4, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            OrgOS — Real-time organizational impact data. Updated daily.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}
