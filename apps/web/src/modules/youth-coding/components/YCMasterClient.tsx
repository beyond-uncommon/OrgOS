"use client";

import { useState, useMemo } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper,
  Select, MenuItem, FormControl, InputLabel, Button, Tabs, Tab, Divider,
} from "@mui/material";
import { UserBar } from "@/components/UserBar";

interface YCStudent {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  grade: string | null;
  community: string | null;
  department: { id: string; name: string };
  instructor: { id: string; name: string };
  sessionAttendance: { projectStatus: string; session: { id: string; date: string | Date } }[];
}

interface YCMetrics {
  totalRegistered: number;
  taughtYTD: number;
  averageAge: number;
  genderBreakdown: { gender: string; count: number }[];
  communityCount: number;
  schoolCount: number;
}

interface Hub {
  id: string;
  name: string;
}

function computeMetrics(students: YCStudent[]): YCMetrics {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const taughtYTD = students.filter(s =>
    s.sessionAttendance.some(a => new Date(a.session.date) >= yearStart)
  ).length;
  const totalAge = students.reduce((sum, s) => sum + (s.age ?? 0), 0);
  const genderMap = new Map<string, number>();
  for (const s of students) {
    if (s.gender) genderMap.set(s.gender, (genderMap.get(s.gender) ?? 0) + 1);
  }
  return {
    totalRegistered: students.length,
    taughtYTD,
    averageAge: students.length ? Math.round((totalAge / students.length) * 10) / 10 : 0,
    genderBreakdown: [...genderMap.entries()].map(([gender, count]) => ({ gender, count })),
    communityCount: new Set(students.map(s => s.community).filter(Boolean)).size,
    schoolCount: new Set(students.map(s => s.school).filter(Boolean)).size,
  };
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2, minWidth: 140 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em", color: "primary.main" }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
    </Box>
  );
}

export function YCMasterClient({
  user,
  students,
  metrics: serverMetrics,
  hubs,
}: {
  user: { name: string; role: string };
  students: YCStudent[];
  metrics: YCMetrics;
  hubs: Hub[];
}) {
  const [tab, setTab] = useState(0);
  const [selectedHub, setSelectedHub] = useState("");
  const [hubFilter, setHubFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const hubStudents = useMemo(
    () => selectedHub ? students.filter(s => s.department.id === selectedHub) : students,
    [students, selectedHub],
  );

  const metrics = useMemo(
    () => selectedHub ? computeMetrics(hubStudents) : serverMetrics,
    [hubStudents, selectedHub, serverMetrics],
  );

  const schools = useMemo(() => [...new Set(hubStudents.map(s => s.school).filter(Boolean))].sort() as string[], [hubStudents]);
  const grades = useMemo(() => [...new Set(hubStudents.map(s => s.grade).filter(Boolean))].sort() as string[], [hubStudents]);

  const filtered = hubStudents.filter(s =>
    (!hubFilter || s.department.name === hubFilter) &&
    (!schoolFilter || s.school === schoolFilter) &&
    (!genderFilter || s.gender === genderFilter) &&
    (!gradeFilter || s.grade === gradeFilter),
  );

  function exportCSV() {
    const header = "Name,Age,Gender,School,Grade,Community,Hub,Coordinator,Sessions,Completion";
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map(s => {
      const total = s.sessionAttendance.length;
      const complete = s.sessionAttendance.filter(a => a.projectStatus === "COMPLETE").length;
      const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
      return [
        s.name, s.age ?? "", s.gender ?? "", s.school ?? "", s.grade ?? "",
        s.community ?? "", s.department.name, s.instructor.name, total, `${rate}%`,
      ].map(esc).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yc-students.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedHubName = hubs.find(h => h.id === selectedHub)?.name ?? "All Hubs";

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <UserBar name={user.name} role={user.role} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Youth Coding</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {students.length} registered students
            </Typography>
          </Box>

          {hubs.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Hub</InputLabel>
              <Select
                value={selectedHub}
                label="Hub"
                onChange={e => { setSelectedHub(e.target.value); setSchoolFilter(""); setHubFilter(""); }}
              >
                <MenuItem value="">All Hubs</MenuItem>
                <Divider />
                {hubs.map(h => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4, borderBottom: "1px solid", borderColor: "divider" }}>
          <Tab label="Metrics" />
          <Tab label="Master Database" />
        </Tabs>

        {/* ── Metrics tab ── */}
        {tab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: "text.secondary", fontWeight: 400 }}>
              {selectedHubName} — {new Date().getFullYear()}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 5 }}>
              <MetricCard label="Registered (all time)" value={metrics.totalRegistered} />
              <MetricCard label="Taught YTD" value={metrics.taughtYTD} />
              <MetricCard label="Avg Age" value={metrics.averageAge} />
              <MetricCard label="Schools" value={metrics.schoolCount} />
              <MetricCard label="Communities" value={metrics.communityCount} />
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.7rem" }}>
              Gender Breakdown
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {metrics.genderBreakdown.map(g => (
                <MetricCard key={g.gender} label={g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : "Other"} value={g.count} />
              ))}
            </Box>
          </Box>
        )}

        {/* ── Master Database tab ── */}
        {tab === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>School</InputLabel>
                  <Select value={schoolFilter} label="School" onChange={e => setSchoolFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {schools.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Gender</InputLabel>
                  <Select value={genderFilter} label="Gender" onChange={e => setGenderFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="M">M</MenuItem>
                    <MenuItem value="F">F</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Grade</InputLabel>
                  <Select value={gradeFilter} label="Grade" onChange={e => setGradeFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {grades.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Button variant="outlined" size="small" onClick={exportCSV}>Export CSV</Button>
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {filtered.length} of {hubStudents.length} students{selectedHub ? ` in ${selectedHubName}` : ""}
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>School</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Community</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Hub</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Coordinator</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Sessions</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Completion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(s => {
                    const total = s.sessionAttendance.length;
                    const complete = s.sessionAttendance.filter(a => a.projectStatus === "COMPLETE").length;
                    const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
                    return (
                      <TableRow key={s.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.age ?? "—"}</TableCell>
                        <TableCell>{s.gender ?? "—"}</TableCell>
                        <TableCell>{s.school ?? "—"}</TableCell>
                        <TableCell>{s.grade ?? "—"}</TableCell>
                        <TableCell>{s.community ?? "—"}</TableCell>
                        <TableCell>{s.department.name}</TableCell>
                        <TableCell>{s.instructor.name}</TableCell>
                        <TableCell>{total}</TableCell>
                        <TableCell>{rate}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>
    </Box>
  );
}
