"use client";

import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BarChart } from "@mui/x-charts/BarChart";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function TrendBadge({ value, label }: { value: number | null; label?: string }) {
  if (value === null) return null;
  const up = value > 0;
  const neutral = value === 0;
  const color = up ? "success.main" : neutral ? "text.secondary" : "error.main";
  const arrow = up ? "\u2191" : neutral ? "\u2192" : "\u2193";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.3,
        fontSize: "0.75rem",
        fontWeight: 600,
        color,
        bgcolor: alpha(color, 0.1),
        borderRadius: 1,
        px: 0.75,
        py: 0.25,
      }}
    >
      {arrow} {Math.abs(value)}% {label ?? "vs last year"}
    </Box>
  );
}

function alpha(hexColor: string, opacity: number): string {
  const c = hexColor.startsWith("#") ? hexColor.slice(1) : "";
  if (c.length !== 6) return `rgba(0,0,0,${opacity})`;
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  "Youth Coding": "After-school coding clubs teaching web development and problem-solving to youth aged 10\u201318.",
  "Bootcamp": "Intensive career training programs preparing students for in-demand technology roles.",
  "Teacher Training": "Equipping educators with modern teaching methods and technology skills to transform classrooms.",
  "Outreach": "Community engagement initiatives bringing technology awareness and digital literacy to underserved communities.",
};

interface GenderItem { gender: string; count: number }

interface StudentQuote { student: string; quote: string; rating: number; date: Date }

interface Props {
  overview: {
    totalStudents: number;
    totalPrograms: number;
    totalHubs: number;
    totalFunding: number;
    fundingTrend: number | null;
    costPerStudent: number | null;
    overallGender: GenderItem[];
    overallSchools: number;
    overallCommunities: number;
    todayStr: string;
    dailyEntryCount: number;
    avgDailySummary: number;
  };
  ycData: {
    name: string; students: number; hubs: number; schools: number; communities: number;
    avgAge: number | null; sessions: number; sessionsTrend: number | null;
    sessionsByMonth: number[]; completionRate: number; completedStudents: number | null;
    gender: GenderItem[]; funding: number;
    studentReportsCount: number; avgRating: number | null; latestStudentQuotes: StudentQuote[];
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

function MetricCard({ label, value, color, trend }: { label: string; value: string; color?: string; trend?: React.ReactNode }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center" }}>
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", color: color ?? "text.primary", mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: trend ? 0.5 : 0 }}>{label}</Typography>
        {trend}
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

function GenderDisplay({ data }: { data: GenderItem[] }) {
  if (!data.length) return null;
  return (
    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {data.map(g => (
        <Box key={g.gender} sx={{ textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{g.count}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : g.gender === "O" ? "Other" : g.gender}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function DemographicsBox({ gender, students, schools, communities }: {
  gender: GenderItem[]; students: number; schools: number; communities: number;
}) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Gender Distribution</Typography>
          <GenderDisplay data={gender} />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>Coverage</Typography>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <StatBox label="Students" value={students} />
            <StatBox label="Schools" value={schools} />
            <StatBox label="Communities" value={communities} />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}

function GoalCard({ label, target }: { label: string; target: string }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center", opacity: 0.7 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", color: "text.disabled", mb: 0.5 }}>
          {target}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.disabled" }}>{label}</Typography>
      </Box>
    </Grid>
  );
}

function SessionsChart({ data }: { data: number[] }) {
  const hasData = data.some(d => d > 0);
  if (!hasData) return null;
  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
        Sessions by Month
      </Typography>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", p: 2 }}>
        <BarChart
          xAxis={[{ data: MONTHS, scaleType: "band", tickLabelStyle: { fontSize: 11 } }]}
          series={[{ data, color: "#1976d2" }]}
          height={250}
          margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
          yAxis={[{ tickLabelStyle: { fontSize: 11 } }]}
        />
      </Box>
    </Box>
  );
}

function FunderLogo({ name }: { name: string }) {
  return (
    <Box
      sx={{
        width: 140,
        height: 60,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.paper",
        px: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 500, textAlign: "center" }}>
        {name}
      </Typography>
    </Box>
  );
}

export function ImpactClient(props: Props) {
  const { overview, ycData, bootcampData, teacherTrainingName, teacherTrainingFunding, outreachName, outreachFunding } = props;
  const [tab, setTab] = React.useState(0);

  const activeProgramName = tab === 1 ? ycData?.name : tab === 2 ? bootcampData?.name : tab === 3 ? teacherTrainingName : tab === 4 ? outreachName : null;
  const programDesc = activeProgramName ? PROGRAM_DESCRIPTIONS[activeProgramName] : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* ── NAV ───────────────────────────────────────────── */}
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Button variant="outlined" size="small" href="mailto:info@uncommon.org" sx={{ textTransform: "none" }}>
              Contact Us
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── HERO ─────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: "0.08em", mb: 1, display: "block" }}>
            {overview.todayStr}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.03em", mb: 1 }}>
            Our Impact
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 400, opacity: 0.85, maxWidth: 640, mb: 3, lineHeight: 1.6 }}>
            Uncommon.org empowers underserved youth across Africa through technology education \u2014
            providing coding skills, career training, and pathways to economic opportunity.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 0.5 }}>
            <Typography variant="h1" sx={{ fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, fontSize: { xs: "3rem", md: "4.5rem" } }}>
              {fmt(overview.totalStudents)}
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 500, opacity: 0.85, mb: 3 }}>
            Students Reached Across {overview.totalPrograms} Programs
          </Typography>

          <Box sx={{ display: "flex", gap: { xs: 3, md: 5 }, flexWrap: "wrap", alignItems: "center" }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(overview.totalPrograms)}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>Programs</Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(overview.totalHubs)}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>Active Hubs</Typography>
            </Box>
            {overview.totalFunding > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{"$" + overview.totalFunding.toLocaleString("en-US")}</Typography>
                  <TrendBadge value={overview.fundingTrend} />
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Total Funding</Typography>
              </Box>
            )}
            {overview.costPerStudent !== null && (
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{"$" + overview.costPerStudent.toLocaleString("en-US")}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Cost per Student</Typography>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* ── TABS ─────────────────────────────────────────── */}
      <Container maxWidth="lg">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}
        >
          <Tab label="Overall" />
          {ycData && <Tab label={ycData.name} />}
          {bootcampData && <Tab label={bootcampData.name} />}
          <Tab label={teacherTrainingName} />
          <Tab label={outreachName} />
        </Tabs>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 6 }}>

        {/* ── Program description ────────────────────────── */}
        {programDesc && tab !== 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, fontStyle: "italic" }}>
            {programDesc}
          </Typography>
        )}

        {/* ── OVERALL TAB ─────────────────────────────────── */}
        {tab === 0 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Total Students" value={fmt(overview.totalStudents)} color="primary.main" />
              <MetricCard label="Programs" value={fmt(overview.totalPrograms)} color="secondary.main" />
              <MetricCard label="Active Hubs" value={fmt(overview.totalHubs)} color="success.main" />
              {overview.totalFunding ? <MetricCard label="Total Funding" value={"$" + overview.totalFunding.toLocaleString("en-US")} color="warning.main" trend={<TrendBadge value={overview.fundingTrend} />} /> : null}
              {overview.costPerStudent !== null ? <MetricCard label="Cost per Student" value={"$" + overview.costPerStudent.toLocaleString("en-US")} color="info.main" /> : null}
            </Grid>

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Demographics
              </Typography>
              <DemographicsBox gender={overview.overallGender} students={overview.totalStudents} schools={overview.overallSchools} communities={overview.overallCommunities} />
            </Box>

            {/* Daily entry report summary */}
            {overview.dailyEntryCount > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Operational Activity ({overview.dailyEntryCount} entries this year)
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center" }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main" }}>{fmt(overview.dailyEntryCount)}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Staff Reports Submitted</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, bgcolor: "background.paper", textAlign: "center" }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: "secondary.main" }}>{overview.avgDailySummary}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Avg Words per Summary</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}

        {/* ── YOUTH CODING TAB ────────────────────────────── */}
        {tab === 1 && ycData && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Registered Students" value={fmt(ycData.students)} color="primary.main" />
              <MetricCard label="Hubs" value={fmt(ycData.hubs)} color="secondary.main" />
              <MetricCard label="Average Age" value={ycData.avgAge !== null ? String(ycData.avgAge) : "\u2014"} color="info.main" />
              <MetricCard label="Sessions YTD" value={fmt(ycData.sessions)} color="success.main" trend={<TrendBadge value={ycData.sessionsTrend} />} />
              <MetricCard label="Completion Rate" value={`${ycData.completionRate}%`} color="warning.main" />
              {ycData.completedStudents !== null && (
                <MetricCard label="Students Completed" value={fmt(ycData.completedStudents)} color="success.main" />
              )}
              <MetricCard label="Schools" value={fmt(ycData.schools)} color="text.primary" />
              <MetricCard label="Communities" value={fmt(ycData.communities)} color="text.primary" />
              <MetricCard label="Funding" value={ycData.funding ? "$" + ycData.funding.toLocaleString("en-US") : "\u2014"} color="success.main" />
            </Grid>

            <SessionsChart data={ycData.sessionsByMonth} />

            {/* Student feedback quotes */}
            {ycData.studentReportsCount > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Student Voice ({ycData.studentReportsCount} reports, avg {ycData.avgRating}/5)
                </Typography>
                <Grid container spacing={2}>
                  {ycData.latestStudentQuotes.map((q, i) => (
                    <Grid key={i} size={{ xs: 12, md: 6 }}>
                      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3, bgcolor: "background.paper", position: "relative" }}>
                        <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                          {q.student}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", lineHeight: 1.6, mb: 1.5 }}>
                          &ldquo;{q.quote.length > 150 ? q.quote.slice(0, 150) + "\u2026" : q.quote}&rdquo;
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Box key={i} sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: i < q.rating ? "primary.main" : "divider" }} />
                          ))}
                          <Typography variant="caption" sx={{ color: "text.disabled", ml: 0.5 }}>
                            {new Date(q.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Demographics
              </Typography>
              <DemographicsBox gender={ycData.gender} students={ycData.students} schools={ycData.schools} communities={ycData.communities} />
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
              <MetricCard label="Avg Attendance" value={bootcampData.avgAttendance !== null ? `${bootcampData.avgAttendance}%` : "\u2014"} color="success.main" />
              <MetricCard label="Funding" value={bootcampData.funding ? "$" + bootcampData.funding.toLocaleString("en-US") : "\u2014"} color="warning.main" />
            </Grid>
          </>
        )}

        {/* ── TEACHER TRAINING TAB ────────────────────────── */}
        {tab === 3 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Teachers Trained" value="\u2014" color="primary.main" />
              <MetricCard label="Sessions Conducted" value="\u2014" color="secondary.main" />
              <MetricCard label="Certifications" value="\u2014" color="info.main" />
              <MetricCard label="Funding" value={teacherTrainingFunding ? "$" + teacherTrainingFunding.toLocaleString("en-US") : "\u2014"} color="success.main" />
            </Grid>

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                2026 Goals
              </Typography>
              <Grid container spacing={3}>
                <GoalCard label="Teachers to Train" target="500" />
                <GoalCard label="Workshops" target="24" />
                <GoalCard label="Certification Target" target="400" />
                <GoalCard label="Partner Schools" target="20" />
              </Grid>
            </Box>

            <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Live metrics will appear once programs are active. In the meantime, these are our targets for 2026.
              </Typography>
            </Box>
          </>
        )}

        {/* ── OUTREACH TAB ────────────────────────────────── */}
        {tab === 4 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <MetricCard label="Communities Reached" value="\u2014" color="primary.main" />
              <MetricCard label="Events Conducted" value="\u2014" color="secondary.main" />
              <MetricCard label="People Reached" value="\u2014" color="info.main" />
              <MetricCard label="Funding" value={outreachFunding ? "$" + outreachFunding.toLocaleString("en-US") : "\u2014"} color="success.main" />
            </Grid>

            <Box sx={{ mb: 5 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                2026 Goals
              </Typography>
              <Grid container spacing={3}>
                <GoalCard label="Communities" target="30" />
                <GoalCard label="Outreach Events" target="50" />
                <GoalCard label="People to Reach" target="10,000" />
                <GoalCard label="Partner Orgs" target="15" />
              </Grid>
            </Box>

            <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Live metrics will appear once programs are active. In the meantime, these are our targets for 2026.
              </Typography>
            </Box>
          </>
        )}

        {/* ── SHARED: FUNDERS SECTION ─────────────────────── */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
            Supported By
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FunderLogo name="Global Fund for Education" />
            <FunderLogo name="Tech for Good Foundation" />
            <FunderLogo name="Africa Development Initiative" />
            <FunderLogo name="Partner Organization" />
          </Box>
        </Box>

        {/* ── SHARED: TESTIMONIAL ─────────────────────────── */}
        <Box
          sx={{
            mb: 5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            p: { xs: 3, md: 5 },
            textAlign: "center",
            maxWidth: 700,
            mx: "auto",
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 400, fontStyle: "italic", mb: 2, lineHeight: 1.5, color: "text.primary" }}>
            &ldquo;Before joining this program, I had never written a line of code. Now I&rsquo;m building my own apps and teaching my friends. It changed my future.&rdquo;
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            &mdash; Student, Youth Coding Program
          </Typography>
        </Box>

        {/* ── SHARED: CTA ──────────────────────────────────── */}
        <Divider sx={{ mb: 4 }} />
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Support Our Mission
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, maxWidth: 500, mx: "auto" }}>
            Help us reach more students, train more teachers, and build stronger communities across Africa.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="contained" size="large" href="mailto:donate@uncommon.org" sx={{ textTransform: "none", px: 4 }}>
              Donate
            </Button>
            <Button variant="outlined" size="large" href="mailto:partnerships@uncommon.org" sx={{ textTransform: "none", px: 4 }}>
              Partner With Us
            </Button>
            <Button variant="outlined" size="large" href="mailto:info@uncommon.org" sx={{ textTransform: "none", px: 4 }}>
              Get Involved
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mt: 4, mb: 3 }} />

        {/* ── FOOTER ──────────────────────────────────────── */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            OrgOS — Real-time organizational impact data. Updated hourly.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
