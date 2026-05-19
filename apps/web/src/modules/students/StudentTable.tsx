"use client";

import * as React from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Button,
  Paper,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import { type ProgramType } from "./queries";

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

interface StudentTableProps {
  students: UnifiedStudent[];
  programs: readonly string[];
  statuses: readonly string[];
}

const programLabels: Record<string, string> = {
  "youth-coding": "YC",
  bootcamp: "Bootcamp",
  "teacher-training": "Teacher Training",
  outreach: "Outreach",
};

const statusColors: Record<string, "success" | "error" | "warning" | "default"> = {
  ACTIVE: "success",
  DROPPED: "error",
  GRADUATED: "warning",
  PAUSED: "default",
};

export function StudentTable({ students, programs, statuses }: StudentTableProps) {
  const [search, setSearch] = React.useState("");
  const [programFilter, setProgramFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filteredStudents = React.useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !search || student.name.toLowerCase().includes(search.toLowerCase());
      const matchesProgram = programFilter === "all" || student.linkedPrograms.includes(programFilter);
      const matchesStatus = statusFilter === "all" || student.enrollmentStatus === statusFilter;
      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [students, search, programFilter, statusFilter]);

  const columns: GridColDef<UnifiedStudent>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "age",
      headerName: "Age",
      width: 80,
      valueGetter: (value, row) => row.age ?? "-",
    },
    {
      field: "linkedPrograms",
      headerName: "Program",
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {params.value?.map((p: string) => (
            <Chip
              key={p}
              label={programLabels[p] || p}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )) || "-"}
        </Box>
      ),
    },
    {
      field: "school",
      headerName: "School",
      flex: 1,
      minWidth: 120,
      valueGetter: (value, row) => row.school ?? "-",
    },
    {
      field: "enrollmentStatus",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={statusColors[params.value as string] || "default"}
          sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
        />
      ),
    },
    {
      field: "sessionCount",
      headerName: "Sessions",
      width: 90,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "avgRating",
      headerName: "Avg Rating",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueGetter: (value, row) => row.avgRating ?? "-",
    },
    {
      field: "lastActivityDate",
      headerName: "Last Activity",
      width: 120,
      valueGetter: (value, row) => {
        if (!row.lastActivityDate) return "-";
        return new Date(row.lastActivityDate).toLocaleDateString();
      },
    },
  ];

  const handleExportCSV = () => {
    const headers = ["Name", "Age", "Programs", "School", "Status", "Sessions", "Avg Rating", "Last Activity"];
    const rows = filteredStudents.map(s => [
      s.name,
      s.age ?? "",
      s.linkedPrograms.join(", "),
      s.school ?? "",
      s.enrollmentStatus,
      s.sessionCount.toString(),
      s.avgRating?.toString() ?? "",
      s.lastActivityDate ? new Date(s.lastActivityDate).toLocaleDateString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Program</InputLabel>
          <Select
            value={programFilter}
            label="Program"
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <MenuItem value="all">All Programs</MenuItem>
            {programs.map((p) => (
              <MenuItem key={p} value={p}>
                {programLabels[p] || p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            {statuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          sx={{ borderColor: "divider" }}
        >
          Export CSV
        </Button>
      </Box>

      <Paper
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={filteredStudents}
          columns={columns}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          onRowClick={(params) => {
            window.location.href = `/students/${params.row.id}`;
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: "2px solid",
              borderColor: "divider",
              bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.5)",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              typography: "subtitle2",
              fontWeight: 600,
            },
            "& .MuiDataGrid-cell": {
              typography: "body2",
            },
            "& .MuiDataGrid-row": {
              cursor: "pointer",
              "&:hover": {
                bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.04)",
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
}