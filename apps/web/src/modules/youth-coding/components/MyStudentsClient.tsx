"use client";

import { useState } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper,
  TextField, IconButton, Select, MenuItem, Button, Stack,
} from "@mui/material";
import Link from "next/link";
import { updateStudent } from "../actions/updateStudent";
import { UserBar } from "@/components/UserBar";
import { AddStudentDialog } from "./AddStudentDialog";
import { CsvUploadDialog } from "./CsvUploadDialog";

interface Student {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  grade: string | null;
  community: string | null;
  enrollmentStatus: string;
}

export function MyStudentsClient({
  user,
  students: initial,
  instructorId,
  departmentId,
}: {
  user: { name: string; role: string };
  students: Student[];
  instructorId: string;
  departmentId: string;
}) {
  const [students, setStudents] = useState(initial);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Student>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = students.filter(
    s => !filter || (s.school ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  function startEdit(s: Student) {
    setEditing(s.id);
    setDraft({ name: s.name, age: s.age, gender: s.gender, school: s.school, grade: s.grade, community: s.community });
  }

  async function saveEdit(id: string) {
    const result = await updateStudent(id, draft);
    if (result.success) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
      setEditing(null);
    }
  }

  function handleStudentCreated(student: Student) {
    setStudents(prev => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleCsvComplete(created: number) {
    // Reload page to get fresh data after bulk import
    if (created > 0) window.location.reload();
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <UserBar name={user.name} role={user.role} />
              <Typography component={Link} href="/student" sx={{ fontSize: "0.75rem", color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                ← Dashboard
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>My Students</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {students.length} registered youth coding student{students.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={() => setCsvOpen(true)}>
              Bulk Upload CSV
            </Button>
            <Button variant="contained" size="small" onClick={() => setAddOpen(true)}>
              + Add Student
            </Button>
          </Stack>
        </Box>

        <TextField
          label="Filter by school"
          size="small"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          sx={{ mb: 3, width: 240 }}
        />

        {filtered.length === 0 ? (
          <Typography sx={{ color: "text.secondary" }}>
            {students.length === 0
              ? "No students registered yet. Add a student or submit a session to get started."
              : "No students match the current filter."}
          </Typography>
        ) : (
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
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    {editing === s.id ? (
                      <>
                        <TableCell>
                          <TextField size="small" value={draft.name ?? ""} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={draft.age ?? ""} onChange={e => setDraft(d => ({ ...d, age: Number(e.target.value) }))} sx={{ width: 60 }} />
                        </TableCell>
                        <TableCell>
                          <Select size="small" value={draft.gender ?? ""} onChange={e => setDraft(d => ({ ...d, gender: e.target.value }))}>
                            <MenuItem value="M">M</MenuItem>
                            <MenuItem value="F">F</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={draft.school ?? ""} onChange={e => setDraft(d => ({ ...d, school: e.target.value }))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={draft.grade ?? ""} onChange={e => setDraft(d => ({ ...d, grade: e.target.value }))} sx={{ width: 80 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={draft.community ?? ""} onChange={e => setDraft(d => ({ ...d, community: e.target.value }))} />
                        </TableCell>
                        <TableCell>{s.enrollmentStatus}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => saveEdit(s.id)}>✓</IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.age ?? "—"}</TableCell>
                        <TableCell>{s.gender ?? "—"}</TableCell>
                        <TableCell>{s.school ?? "—"}</TableCell>
                        <TableCell>{s.grade ?? "—"}</TableCell>
                        <TableCell>{s.community ?? "—"}</TableCell>
                        <TableCell>{s.enrollmentStatus}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => startEdit(s)}>✎</IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <AddStudentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        instructorId={instructorId}
        departmentId={departmentId}
        onCreated={handleStudentCreated}
      />

      <CsvUploadDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        instructorId={instructorId}
        departmentId={departmentId}
        onComplete={handleCsvComplete}
      />
    </Box>
  );
}
