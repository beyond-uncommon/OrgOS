"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Box, Alert,
} from "@mui/material";
import { registerStudent } from "../actions/registerStudent";
import type { StudentRegistrationInput } from "../schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (student: { id: string; name: string; age: number | null; gender: string | null; school: string | null; grade: string | null; community: string | null; enrollmentStatus: string }) => void;
}

const EMPTY: StudentRegistrationInput = {
  name: "",
  age: 0,
  gender: "M",
  school: "",
  grade: "",
  community: "",
};

export function AddStudentDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<StudentRegistrationInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof StudentRegistrationInput>(key: K, value: StudentRegistrationInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const result = await registerStudent(form);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to register student");
      return;
    }
    onCreated({
      id: result.data.id,
      name: result.data.name,
      age: form.age,
      gender: form.gender,
      school: form.school,
      grade: form.grade,
      community: form.community,
      enrollmentStatus: "ACTIVE",
    });
    setForm(EMPTY);
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Student</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Full Name"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            fullWidth
            required
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Age"
              type="number"
              value={form.age || ""}
              onChange={e => set("age", Number(e.target.value))}
              inputProps={{ min: 1, max: 25 }}
              sx={{ flex: 1 }}
              required
            />
            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Gender</InputLabel>
              <Select
                label="Gender"
                value={form.gender}
                onChange={e => set("gender", e.target.value as "M" | "F" | "Other")}
              >
                <MenuItem value="M">Male</MenuItem>
                <MenuItem value="F">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="School"
              value={form.school}
              onChange={e => set("school", e.target.value)}
              sx={{ flex: 2 }}
              required
            />
            <TextField
              label="Grade"
              value={form.grade}
              onChange={e => set("grade", e.target.value)}
              sx={{ flex: 1 }}
              required
            />
          </Box>
          <TextField
            label="Community"
            value={form.community}
            onChange={e => set("community", e.target.value)}
            fullWidth
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !form.name || !form.school || !form.grade || !form.community || !form.age}>
          {saving ? "Saving…" : "Add Student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
