"use client";

import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function cur(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

interface GenderItem { gender: string; count: number }
interface FundingItem { id: string; source: string; description: string; amount: number; receivedAt: string }

interface Props {
  overview: {
    totalStudents: number;
    totalPrograms: number;
    totalHubs: number;
    totalFunding: number;
    overallGender: GenderItem[];
    overallSchools: number;
    overallCommunities: number;
    fundingRecords: FundingItem[];
  };
  ycData: {
    name: string; students: number; hubs: number; schools: number; communities: number;
    avgAge: number | null; sessions: number; completionRate: number;
    gender: GenderItem[]; funding: number;
  } | null;
  bootcampData: {
    name: string; students: number; bootcamps: number; hubs: number;
    avgAttendance: number | null; funding: number;
  } | null;
  teacherTrainingName: string;
  teacherTrainingFunding: number;
  outreachName: string;
  outreachFunding: number;
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center" }}>
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", color: color ?? "text.primary", mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
      </Box>
    </Grid>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>{typeof value === "number" ? fmt(value) : value}</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
    </Box>
  );
}

function FundingSection({ records, total }: { records: FundingItem[]; total: number }) {
  if (!records.length) return null;
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", overflow: "hidden" }}>
      {records.map(r => (
        <Box key={r.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.source}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {r.description}{r.receivedAt ? ` · ${new Date(r.receivedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main", flexShrink: 0, ml: 2 }}>{cur(r.amount)}</Typography>
        </Box>
      ))}
      <Box sx={{ display: "flex", justifyContent: "space-between", px: 3, py: 2.5, bgcolor: "grey.100" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Total</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>{cur(total)}</Typography>
      </Box>
    </Box>
  );
}

function GenderDisplay({ data }: { data: GenderItem[] }) {
  if (!data.length) return null;
  return (
    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {data.map(g => (
        <Box key={g.gender} sx={{ textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{g.count}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : g.gender}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function ImpactClient(props: Props) {
  const { overview, ycData, bootcampData, teacherTrainingName, teacherTrainingFunding, outreachName, outreachFunding } = props;
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", mb: 1 }}>
            Our Impact
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9, maxWidth: 500 }}>
            Real-time metrics from every program, every hub, every day.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
          <Tab label="Overall" />
          {ycData && <Tab label={ycData.name} />}
          {bootcampData && <Tab label={bootcampData.name} />}
          <Tab label={teacherTrainingName} />
          <Tab label={outreachName} />
        </Tabs>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 6 }}>

        {/* ── OVERALL TAB ─────────────────────────────────── */}
        {tab === 0 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Total Students" value={fmt(overview.totalStudents)} color="primary.main" />
              <MetricCard label="Programs" value={fmt(overview.totalPrograms)} color="secondary.main" />
              <MetricCard label="Active Hubs" value={fmt(overview.totalHubs)} color="success.main" />
              <MetricCard label="Total Funding YTD" value={overview.totalFunding ? cur(overview.totalFunding) : "—"} color="warning.main" />
            </Grid>

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Demographics
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Gender Distribution</Typography>
                    <GenderDisplay data={overview.overallGender} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Coverage</Typography>
                    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      <StatBox label="Students" value={overview.totalStudents} />
                      <StatBox label="Schools" value={overview.overallSchools} />
                      <StatBox label="Communities" value={overview.overallCommunities} />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
              Funding Sources
            </Typography>
            <FundingSection records={overview.fundingRecords} total={overview.totalFunding} />
          </>
        )}

        {/* ── YOUTH CODING TAB ────────────────────────────── */}
        {tab === 1 && ycData && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Registered Students" value={fmt(ycData.students)} color="primary.main" />
              <MetricCard label="Hubs" value={fmt(ycData.hubs)} color="secondary.main" />
              <MetricCard label="Average Age" value={ycData.avgAge !== null ? String(ycData.avgAge) : "—"} color="info.main" />
              <MetricCard label="Sessions YTD" value={fmt(ycData.sessions)} color="success.main" />
              <MetricCard label="Completion Rate" value={`${ycData.completionRate}%`} color="warning.main" />
              <MetricCard label="Schools" value={fmt(ycData.schools)} color="text.primary" />
              <MetricCard label="Communities" value={fmt(ycData.communities)} color="text.primary" />
              <MetricCard label="Funding" value={ycData.funding ? cur(ycData.funding) : "—"} color="success.main" />
            </Grid>

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Demographics
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Gender Distribution</Typography>
                    <GenderDisplay data={ycData.gender} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Coverage</Typography>
                    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      <StatBox label="Students" value={ycData.students} />
                      <StatBox label="Schools" value={ycData.schools} />
                      <StatBox label="Communities" value={ycData.communities} />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        {/* ── BOOTCAMP TAB ────────────────────────────────── */}
        {tab === 2 && bootcampData && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Students" value={fmt(bootcampData.students)} color="primary.main" />
              <MetricCard label="Bootcamps" value={fmt(bootcampData.bootcamps)} color="secondary.main" />
              <MetricCard label="Hubs" value={fmt(bootcampData.hubs)} color="info.main" />
              <MetricCard label="Avg Attendance" value={bootcampData.avgAttendance !== null ? `${bootcampData.avgAttendance}%` : "—"} color="success.main" />
              <MetricCard label="Funding" value={bootcampData.funding ? cur(bootcampData.funding) : "—"} color="warning.main" />
            </Grid>
          </>
        )}

        {/* ── TEACHER TRAINING TAB ────────────────────────── */}
        {tab === 3 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Teachers Trained" value="—" color="primary.main" />
              <MetricCard label="Sessions Conducted" value="—" color="secondary.main" />
              <MetricCard label="Certifications" value="—" color="info.main" />
              <MetricCard label="Funding" value={teacherTrainingFunding ? cur(teacherTrainingFunding) : "—"} color="success.main" />
            </Grid>
            <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Teacher Training metrics will appear once programs are active.
              </Typography>
            </Box>
          </>
        )}

        {/* ── OUTREACH TAB ────────────────────────────────── */}
        {tab === 4 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Communities Reached" value="—" color="primary.main" />
              <MetricCard label="Events Conducted" value="—" color="secondary.main" />
              <MetricCard label="People Reached" value="—" color="info.main" />
              <MetricCard label="Funding" value={outreachFunding ? cur(outreachFunding) : "—"} color="success.main" />
            </Grid>
            <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Outreach metrics will appear once programs are active.
              </Typography>
            </Box>
          </>
        )}

        <Box sx={{ mt: 6, pt: 3, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            OrgOS — Real-time organizational impact data. Updated hourly.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
