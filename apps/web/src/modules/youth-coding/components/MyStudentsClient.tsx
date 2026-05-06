"use client";

import { useState } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, IconButton, Select, MenuItem,
} from "@mui/material";
import Link from "next/link";
import { updateStudent } from "../actions/updateStudent";
import { UserBar } from "@/components/UserBar";

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
}: {
  user: { id: string; name: string; role: string };
  students: Student[];
}) {
  const [students, setStudents] = useState(initial);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Student>>({});

  const filtered = students.filter(
    s => !filter || (s.school ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  function startEdit(s: Student) {
    setEditing(s.id);
    setDraft({ name: s.name, age: s.age, gender: s.gender, school: s.school, grade: s.grade, community: s.community });
  }

  async function saveEdit(id: string) {
    const result = await updateStudent(id, user.id, draft);
    if (result.success) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
      setEditing(null);
    }
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
        <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>My Students</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          {students.length} registered youth coding students
        </Typography>

        <TextField
          label="Filter by school"
          size="small"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          sx={{ mb: 3, width: 240 }}
        />

        {filtered.length === 0 ? (
          <Typography sx={{ color: "text.secondary" }}>
            No students registered yet. Submit your first session to register students.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Age</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>School</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Community</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
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
        )}
      </Container>
    </Box>
  );
}
