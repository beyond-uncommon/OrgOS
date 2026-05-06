"use client";

import { useState, useMemo } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Select, MenuItem, FormControl, InputLabel, Button,
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
  sessionAttendance: { projectStatus: string }[];
}

export function YCMasterClient({
  user,
  students,
}: {
  user: { name: string; role: string };
  students: YCStudent[];
}) {
  const [hubFilter, setHubFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const hubs = useMemo(() => [...new Set(students.map(s => s.department.name))].sort(), [students]);
  const schools = useMemo(() => [...new Set(students.map(s => s.school).filter(Boolean))].sort() as string[], [students]);
  const grades = useMemo(() => [...new Set(students.map(s => s.grade).filter(Boolean))].sort() as string[], [students]);

  const filtered = students.filter(s =>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>
              Youth Coding Master Database
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {filtered.length} of {students.length} students
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={exportCSV}>
            Export CSV
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Hub</InputLabel>
            <Select value={hubFilter} label="Hub" onChange={e => setHubFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {hubs.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
            </Select>
          </FormControl>
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

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Community</TableCell>
              <TableCell>Hub</TableCell>
              <TableCell>Coordinator</TableCell>
              <TableCell>Sessions</TableCell>
              <TableCell>Completion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(s => {
              const total = s.sessionAttendance.length;
              const complete = s.sessionAttendance.filter(a => a.projectStatus === "COMPLETE").length;
              const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
              return (
                <TableRow key={s.id}>
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
      </Container>
    </Box>
  );
}
