"use client";

import * as React from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  bindDeviceToSession,
  recordCheckIn,
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
  sessionToken: string;
  deviceIP: string | null;
  students: StudentItem[];
  initialRecords: RecordItem[];
}

export function CheckInPanel({
  sessionId,
  deviceIP,
  students,
  initialRecords,
}: Props) {
  const [records, setRecords] = React.useState<RecordItem[]>(initialRecords);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [binding, setBinding] = React.useState(!deviceIP);
  const [checkingIn, setCheckingIn] = React.useState<string | null>(null);

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

  const handleCheckIn = async (studentId: string) => {
    if (checkedInIds.has(studentId)) return;
    setCheckingIn(studentId);
    setError(null);

    const res = await recordCheckIn(sessionId, studentId);
    if (res.ok) {
      const student = students.find(s => s.id === studentId);
      setRecords(prev => [
        ...prev,
        {
          studentId,
          studentName: student?.name ?? "",
          checkedInAt: new Date().toISOString(),
        },
      ]);
    } else {
      setError(res.error);
    }
    setCheckingIn(null);
  };

  if (binding) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Initializing attendance device...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Check In — {students.length} students
      </Typography>

      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {students.map(student => {
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
                minWidth: 120,
                py: 1.5,
                px: 2,
                borderRadius: 2,
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: checkedIn ? 500 : 400,
                opacity: checkedIn ? 0.85 : 1,
              }}
              endIcon={
                isCheckingIn ? (
                  <CircularProgress size={16} />
                ) : checkedIn ? (
                  <Chip label="✓" size="small" sx={{ bgcolor: "transparent", p: 0, minWidth: 20 }} />
                ) : undefined
              }
            >
              {student.name}
            </Button>
          );
        })}
      </Box>

      {records.length > 0 && (
        <Box sx={{ mt: 4, p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {records.length} checked in
          </Typography>
          {records.map(r => (
            <Typography key={r.studentId} variant="body2" sx={{ color: "text.secondary" }}>
              {r.studentName} — {new Date(r.checkedInAt).toLocaleTimeString()}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
