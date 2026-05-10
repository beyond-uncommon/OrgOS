"use client";

import * as React from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  TextField,
  Collapse,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  bindDeviceToSession,
  recordCheckIn,
  addWalkInStudent,
} from "../actions/markHubAttendance";

interface StudentItem {
  id: string;
  name: string;
}

interface RecordItem {
  studentId: string;
  studentName: string;
  checkedInAt: string;
}

interface Props {
  sessionId: string;
  departmentId: string;
  deviceIP: string | null;
  students: StudentItem[];
  initialRecords: RecordItem[];
}

export function CheckInPanel({
  sessionId,
  departmentId,
  deviceIP,
  students,
  initialRecords,
}: Props) {
  const [records, setRecords] = React.useState<RecordItem[]>(initialRecords);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [binding, setBinding] = React.useState(!deviceIP);
  const [checkingIn, setCheckingIn] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [walkInName, setWalkInName] = React.useState("");
  const [addingWalkIn, setAddingWalkIn] = React.useState(false);
  const [showRoster, setShowRoster] = React.useState(false);

  React.useEffect(() => {
    if (deviceIP) return;
    bindDeviceToSession(sessionId).then(res => {
      setBinding(false);
      if (!res.ok) {
        if ("bound" in res && res.bound) {
          setWarning("Attendance is already active on another device.");
        } else {
          setError(res.error);
        }
      }
    });
  }, [sessionId, deviceIP]);

  const checkedInIds = new Set(records.map(r => r.studentId));
  const sorted = React.useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students],
  );
  const filtered = search
    ? sorted.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const handleCheckIn = async (studentId: string) => {
    if (checkedInIds.has(studentId)) return;
    setCheckingIn(studentId);
    setError(null);
    const res = await recordCheckIn(sessionId, studentId);
    if (res.ok) {
      const student = students.find(s => s.id === studentId);
      setRecords(prev => [
        ...prev,
        { studentId, studentName: student?.name ?? "", checkedInAt: new Date().toISOString() },
      ]);
    } else {
      setError(res.error);
    }
    setCheckingIn(null);
  };

  const handleWalkIn = async () => {
    if (!walkInName.trim()) return;
    setAddingWalkIn(true);
    setError(null);
    const res = await addWalkInStudent(sessionId, departmentId, walkInName.trim());
    if (res.ok && res.student) {
      setRecords(prev => [
        ...prev,
        { studentId: res.student.id, studentName: res.student.name, checkedInAt: new Date().toISOString() },
      ]);
      setWalkInName("");
    } else {
      setError(res.error);
    }
    setAddingWalkIn(false);
  };

  if (binding) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 3, color: "text.secondary" }}>
          Setting up attendance...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Check-in count */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {records.length}
          <Typography component="span" variant="h4" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {" / "}{students.length}
          </Typography>
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          checked in
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, "& input": { fontSize: "1.05rem", py: 1.5 } }}
      />

      {/* Student grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 1.5,
          mb: 3,
        }}
      >
        {filtered.map(student => {
          const checkedIn = checkedInIds.has(student.id);
          const isCheckingIn = checkingIn === student.id;
          return (
            <Button
              key={student.id}
              variant={checkedIn ? "contained" : "outlined"}
              color={checkedIn ? "success" : "primary"}
              onClick={() => handleCheckIn(student.id)}
              disabled={checkedIn || !!warning || isCheckingIn}
              sx={{
                py: 2,
                px: 1,
                borderRadius: 2.5,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: checkedIn ? 600 : 450,
                minHeight: 56,
                opacity: checkedIn ? 0.75 : 1,
                borderWidth: checkedIn ? 0 : 2,
                "&:hover": !checkedIn ? { borderWidth: 2 } : undefined,
              }}
            >
              {isCheckingIn ? (
                <CircularProgress size={20} />
              ) : (
                student.name
              )}
            </Button>
          );
        })}
        {filtered.length === 0 && (
          <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 4, color: "text.secondary" }}>
            No students found
          </Box>
        )}
      </Box>

      {/* Walk-in */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Walk-in student name..."
          value={walkInName}
          onChange={(e) => setWalkInName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleWalkIn(); }}
          disabled={addingWalkIn}
          sx={{ "& input": { fontSize: "1rem", py: 1.5 } }}
        />
        <Button
          variant="contained"
          onClick={handleWalkIn}
          disabled={!walkInName.trim() || addingWalkIn}
          sx={{ px: 3, textTransform: "none", fontSize: "0.95rem", flexShrink: 0 }}
        >
          {addingWalkIn ? <CircularProgress size={20} /> : "Add + Check In"}
        </Button>
      </Box>

      {/* Toggle roster */}
      {records.length > 0 && (
        <>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowRoster(!showRoster)}
            sx={{ textTransform: "none", color: "text.secondary", fontSize: "0.85rem" }}
          >
            {showRoster ? "Hide" : "Show"} checked-in list ({records.length})
          </Button>
          <Collapse in={showRoster}>
            <Box sx={{ mt: 1, p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              {records.map(r => (
                <Typography key={r.studentId} variant="body2" sx={{ color: "text.secondary", py: 0.3 }}>
                  {r.studentName} — {new Date(r.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Typography>
              ))}
            </Box>
          </Collapse>
        </>
      )}
    </Box>
  );
}
