"use client";

import { Box, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import type { StudentRegistrationInput } from "../schema";

interface StudentRegisterRowProps {
  index: number;
  value: Partial<StudentRegistrationInput>;
  onChange: (index: number, field: keyof StudentRegistrationInput, value: string | number) => void;
}

export function StudentRegisterRow({ index, value, onChange }: StudentRegisterRowProps) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-end", mb: 1.5 }}>
      <TextField
        label="Full Name"
        size="small"
        value={value.name ?? ""}
        onChange={e => onChange(index, "name", e.target.value)}
        sx={{ minWidth: 160 }}
        required
      />
      <TextField
        label="Age"
        type="number"
        size="small"
        value={value.age ?? ""}
        onChange={e => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(index, "age", v);
        }}
        sx={{ width: 70 }}
        required
      />
      <FormControl size="small" sx={{ minWidth: 90 }} required>
        <InputLabel>Gender</InputLabel>
        <Select
          value={value.gender ?? ""}
          label="Gender"
          onChange={e => onChange(index, "gender", e.target.value)}
        >
          <MenuItem value="M">M</MenuItem>
          <MenuItem value="F">F</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="School"
        size="small"
        value={value.school ?? ""}
        onChange={e => onChange(index, "school", e.target.value)}
        sx={{ minWidth: 140 }}
        required
      />
      <TextField
        label="Grade"
        size="small"
        value={value.grade ?? ""}
        onChange={e => onChange(index, "grade", e.target.value)}
        sx={{ width: 80 }}
        required
      />
      <TextField
        label="Community"
        size="small"
        value={value.community ?? ""}
        onChange={e => onChange(index, "community", e.target.value)}
        sx={{ minWidth: 120 }}
        required
      />
    </Box>
  );
}
