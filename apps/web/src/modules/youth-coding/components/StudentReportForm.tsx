"use client";

import * as React from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { submitStudentReport } from "../actions/submitStudentReport";
import { ImageUploader } from "./ImageUploader";

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
}

export function StudentReportForm({ students }: Props) {
  const [studentId, setStudentId] = React.useState("");
  const [learned, setLearned] = React.useState("");
  const [enjoyed, setEnjoyed] = React.useState("");
  const [struggled, setStruggled] = React.useState("");
  const [rating, setRating] = React.useState(3);
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setSubmitting(true);
    setResult(null);

    const res = await submitStudentReport({
      studentId,
      date: new Date().toISOString(),
      learned,
      enjoyed,
      struggled: struggled || undefined,
      rating,
      imageUrls,
    });

    if (res.success) {
      setResult({ ok: true, message: "Report submitted! Thank you." });
      setLearned("");
      setEnjoyed("");
      setStruggled("");
      setImageUrls([]);
    } else {
      setResult({ ok: false, message: res.error });
    }
    setSubmitting(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 500, mx: "auto", p: 3 }}
    >
      <Typography variant="h6" sx={{ mb: 3, textAlign: "center" }}>
        How was your session today?
      </Typography>

      {result && (
        <Alert severity={result.ok ? "success" : "error"} sx={{ mb: 2 }}>
          {result.message}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Your Name</InputLabel>
        <Select
          value={studentId}
          label="Your Name"
          onChange={(e) => setStudentId(e.target.value)}
          required
        >
          {students.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="What did you learn today?"
        value={learned}
        onChange={(e) => setLearned(e.target.value)}
        multiline
        rows={2}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="What did you enjoy?"
        value={enjoyed}
        onChange={(e) => setEnjoyed(e.target.value)}
        multiline
        rows={2}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Anything you found difficult?"
        value={struggled}
        onChange={(e) => setStruggled(e.target.value)}
        multiline
        rows={2}
        sx={{ mb: 3 }}
      />

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
          How was your day? (1 = tough, 5 = great)
        </Typography>
        <Slider
          value={rating}
          onChange={(_, v) => setRating(v as number)}
          min={1}
          max={5}
          step={1}
          marks={[
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 4, label: "4" },
            { value: 5, label: "5" },
          ]}
          sx={{ maxWidth: 300, mx: "auto" }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <ImageUploader images={imageUrls} onChange={setImageUrls} />
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !studentId}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </Button>
    </Box>
  );
}
