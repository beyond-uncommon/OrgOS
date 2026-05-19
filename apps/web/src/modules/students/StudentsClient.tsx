"use client";

import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Grid2 as Grid,
} from "@mui/material";
import { StudentTable } from "./StudentTable";

interface UnifiedStudent {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  community: string | null;
  grade: string | null;
  enrollmentStatus: string;
  createdAt: Date;
  department: { id: string; name: string };
  instructor: { id: string; name: string };
  sessionCount: number;
  reportCount: number;
  avgRating: number | null;
  linkedPrograms: string[];
  firstEnrollmentDate: Date | null;
  lastActivityDate: Date | null;
}

interface StudentStats {
  totalActive: number;
  byProgram: Record<string, number>;
  byStatus: Record<string, number>;
  averageAge: number;
  completionRate: number;
  dropoutRate: number;
}

interface StudentsClientProps {
  user: { name: string; role: string };
  students: UnifiedStudent[];
  stats: StudentStats;
  programs: readonly string[];
  statuses: readonly string[];
}

const programLabels: Record<string, string> = {
  "youth-coding": "Youth Coding",
  bootcamp: "Bootcamp",
  "teacher-training": "Teacher Training",
  outreach: "Outreach",
};

export function StudentsClient({
  user,
  students,
  stats,
  programs,
  statuses,
}: StudentsClientProps) {
  const totalStudents = students.length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography
              variant="h6"
              sx={{ color: "text.primary", fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              Student Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {user.name} · {user.role.replace(/_/g, " ")}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Total Students
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {totalStudents}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Active
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1, color: "success.main" }}>
                {stats.totalActive}
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Completion Rate
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1, color: "primary.main" }}>
                {stats.completionRate}%
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Avg Age
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {stats.averageAge || "-"}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            All Students
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Showing {totalStudents} students across all programs. Click a row to view details.
          </Typography>
        </Box>

        <StudentTable students={students} programs={programs} statuses={statuses} />
      </Container>
    </Box>
  );
}