"use client";

import { useState } from "react";
import {
  Box, Button, TextField, Typography, Checkbox, FormControlLabel,
  Select, MenuItem, FormControl, InputLabel, OutlinedInput,
  Alert,
} from "@mui/material";
import { submitSession } from "../actions/submitSession";
import { StudentRegisterRow } from "./StudentRegisterRow";
import type { StudentRegistrationInput, AttendanceRecord } from "../schema";

interface ExistingStudent {
  id: string;
  name: string;
}

interface DeptUser {
  id: string;
  name: string;
  role: string;
}

interface SessionFormProps {
  userId: string;
  departmentId: string;
  existingStudents: ExistingStudent[];
  departmentUsers: DeptUser[];
}

export function SessionForm({
  userId,
  departmentId,
  existingStudents,
  departmentUsers,
}: SessionFormProps) {
  const isFirstLesson = existingStudents.length === 0;

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [school, setSchool] = useState("");
  const [community, setCommunity] = useState("");
  const [instructorIds, setInstructorIds] = useState<string[]>([]);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    existingStudents.map(s => ({ studentId: s.id, present: false, projectStatus: "NOT_COMPLETE" as const })),
  );

  const [newStudents, setNewStudents] = useState<Partial<StudentRegistrationInput>[]>(
    isFirstLesson ? [{}] : [],
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateAttendance(studentId: string, field: "present" | "projectStatus", value: boolean | string) {
    setAttendance(prev =>
      prev.map(a => a.studentId === studentId ? { ...a, [field]: value } : a),
    );
  }

  function updateNewStudent(index: number, field: keyof StudentRegistrationInput, value: string | number) {
    setNewStudents(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitSession(userId, departmentId, {
      phase1: { date, lessonNumber, projectName, school, community, instructorIds },
      attendance,
      newStudents: newStudents.length > 0 ? newStudents : undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Session submitted successfully.
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6">Session Details</Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Lesson Number"
          type="number"
          value={lessonNumber}
          onChange={e => setLessonNumber(Number(e.target.value))}
          required
          sx={{ width: 130 }}
        />
        <TextField
          label="Project Name"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          required
          sx={{ minWidth: 200, flex: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="School Name"
          value={school}
          onChange={e => setSchool(e.target.value)}
          required
          sx={{ minWidth: 200, flex: 1 }}
        />
        <TextField
          label="Community"
          value={community}
          onChange={e => setCommunity(e.target.value)}
          required
          sx={{ minWidth: 160, flex: 1 }}
        />
      </Box>

      <FormControl required>
        <InputLabel>Instructors Present</InputLabel>
        <Select
          multiple
          value={instructorIds}
          onChange={e => setInstructorIds(e.target.value as string[])}
          input={<OutlinedInput label="Instructors Present" />}
          renderValue={selected =>
            (selected as string[])
              .map(id => departmentUsers.find(u => u.id === id)?.name ?? id)
              .join(", ")
          }
        >
          {departmentUsers.map(u => (
            <MenuItem key={u.id} value={u.id}>
              <Checkbox checked={instructorIds.includes(u.id)} />
              {u.name} ({u.role})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h6">
        {isFirstLesson ? "Register Students" : "Student Attendance"}
      </Typography>

      {isFirstLesson ? (
        <Box>
          {newStudents.map((s, i) => (
            <StudentRegisterRow key={i} index={i} value={s} onChange={updateNewStudent} />
          ))}
          <Button
            size="small"
            onClick={() => setNewStudents(prev => [...prev, {}])}
            sx={{ mt: 1 }}
          >
            + Add Student
          </Button>
        </Box>
      ) : (
        <Box>
          {attendance.map(a => {
            const student = existingStudents.find(s => s.id === a.studentId);
            return (
              <Box
                key={a.studentId}
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={a.present}
                      onChange={e => updateAttendance(a.studentId, "present", e.target.checked)}
                    />
                  }
                  label={student?.name ?? a.studentId}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" disabled={!a.present} sx={{ minWidth: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={a.projectStatus}
                    label="Status"
                    onChange={e =>
                      updateAttendance(a.studentId, "projectStatus", e.target.value)
                    }
                  >
                    <MenuItem value="COMPLETE">Complete</MenuItem>
                    <MenuItem value="NOT_COMPLETE">Not Complete</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            );
          })}
          <Button
            size="small"
            onClick={() =>
              setAttendance(prev => [
                ...prev,
                { studentId: `new-${Date.now()}`, present: true, projectStatus: "NOT_COMPLETE" },
              ])
            }
            sx={{ mt: 1 }}
          >
            + Add Student
          </Button>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? "Submitting…" : "Submit Session"}
      </Button>
    </Box>
  );
}
