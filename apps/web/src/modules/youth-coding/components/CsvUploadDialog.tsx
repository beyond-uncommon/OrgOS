"use client";

import { useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, LinearProgress,
} from "@mui/material";
import { bulkRegisterStudents } from "../actions/bulkRegisterStudents";
import type { StudentRegistrationInput } from "../schema";

interface Props {
  open: boolean;
  onClose: () => void;
  instructorId: string;
  departmentId: string;
  onComplete: (created: number) => void;
}

type ParsedRow = StudentRegistrationInput & { _error: string | undefined };

const EXPECTED_HEADERS = ["name", "age", "gender", "school", "grade", "community"];

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? "").split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const nameIdx = headers.indexOf("name");
  const ageIdx = headers.indexOf("age");
  const genderIdx = headers.indexOf("gender");
  const schoolIdx = headers.indexOf("school");
  const gradeIdx = headers.indexOf("grade");
  const communityIdx = headers.indexOf("community");

  return lines.slice(1).filter(l => l.trim()).map((line) => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx] ?? "";
    const ageRaw = cols[ageIdx] ?? "";
    const genderRaw = (cols[genderIdx as number] ?? "").toUpperCase();
    const school = cols[schoolIdx] ?? "";
    const grade = cols[gradeIdx] ?? "";
    const community = cols[communityIdx] ?? "";

    const age = parseInt(ageRaw, 10);
    const gender = genderRaw === "M" || genderRaw === "MALE" ? "M"
      : genderRaw === "F" || genderRaw === "FEMALE" ? "F"
      : genderRaw === "OTHER" ? "Other"
      : genderRaw as "M" | "F" | "Other";

    const errors: string[] = [];
    if (!name) errors.push("name required");
    if (isNaN(age) || age < 1 || age > 25) errors.push("age must be 1–25");
    if (!["M", "F", "Other"].includes(gender)) errors.push("gender must be M, F, or Other");
    if (!school) errors.push("school required");
    if (!grade) errors.push("grade required");
    if (!community) errors.push("community required");

    return { name, age, gender: gender as "M" | "F" | "Other", school, grade, community, _error: errors.length ? errors.join("; ") : undefined };
  });
}

export function CsvUploadDialog({ open, onClose, instructorId, departmentId, onComplete }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => !r._error);
  const invalidRows = rows.filter(r => r._error);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCsv(text));
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleUpload() {
    setUploading(true);
    setError(null);
    const res = await bulkRegisterStudents(instructorId, departmentId, validRows.map(({ _error: _, ...r }) => r));
    setUploading(false);
    if (!res.success) {
      setError(res.error ?? "Upload failed");
      return;
    }
    setResult(res.data);
    onComplete(res.data.created);
  }

  function handleClose() {
    setRows([]);
    setResult(null);
    setError(null);
    onClose();
  }

  function downloadTemplate() {
    const csv = [EXPECTED_HEADERS.join(","), "Jane Doe,14,F,Greenfield Secondary,9,Westside"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Upload Students</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {result ? (
          <Alert severity="success">
            Import complete — {result.created} student{result.created !== 1 ? "s" : ""} added
            {result.skipped > 0 ? `, ${result.skipped} skipped (already exist)` : ""}.
          </Alert>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Upload a CSV with columns: <strong>name, age, gender, school, grade, community</strong>
              </Typography>
              <Button size="small" onClick={downloadTemplate}>Download template</Button>
            </Box>

            {rows.length === 0 ? (
              <Box
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                sx={{
                  border: "2px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  py: 6,
                  textAlign: "center",
                  cursor: "pointer",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Drop a CSV here or click to browse
                </Typography>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
                  <Chip label={`${validRows.length} valid`} color="success" size="small" />
                  {invalidRows.length > 0 && <Chip label={`${invalidRows.length} invalid`} color="error" size="small" />}
                  <Button size="small" sx={{ ml: "auto" }} onClick={() => { setRows([]); if (inputRef.current) inputRef.current.value = ""; }}>
                    Clear
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </Box>
                {uploading && <LinearProgress sx={{ mb: 2 }} />}
                <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Age</TableCell>
                        <TableCell>Gender</TableCell>
                        <TableCell>School</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Community</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} sx={r._error ? { bgcolor: "error.main", opacity: 0.15 } : {}}>
                          <TableCell>{r.name || "—"}</TableCell>
                          <TableCell>{r.age || "—"}</TableCell>
                          <TableCell>{r.gender || "—"}</TableCell>
                          <TableCell>{r.school || "—"}</TableCell>
                          <TableCell>{r.grade || "—"}</TableCell>
                          <TableCell>{r.community || "—"}</TableCell>
                          <TableCell>
                            {r._error && (
                              <Typography variant="caption" sx={{ color: "error.main" }}>{r._error}</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{result ? "Close" : "Cancel"}</Button>
        {!result && rows.length > 0 && validRows.length > 0 && (
          <Button variant="contained" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading…" : `Import ${validRows.length} student${validRows.length !== 1 ? "s" : ""}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
