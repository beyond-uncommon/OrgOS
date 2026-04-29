"use client";

import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { dailyEntryFormSchema, type DailyEntryFormValues, type ReportType, REPORT_TYPES } from "../schema";
import { submitDailyEntry } from "../actions/submitDailyEntry";

interface Student {
  id: string;
  name: string;
  enrollmentStatus: string;
}

interface Props {
  userId: string;
  departmentId: string;
  initialReportType?: ReportType;
  students?: Student[];
}

const EMPTY = (reportType: ReportType): DailyEntryFormValues => ({
  date: new Date(),
  attendanceStatus: "",
  outputCompleted: "",
  blockers: "",
  engagementNotes: "",
  quickSummary: "",
  reportType,
  totalStudents: undefined,
  studentsPresent: undefined,
  dropouts: undefined,
  maleStudents: undefined,
  femaleStudents: undefined,
  otherGender: undefined,
  averageAge: undefined,
  mentorshipPairs: undefined,
  engagementScore: undefined,
  studentsInvolvedIds: undefined,
  guestsVisited: false,
  guestNotes: undefined,
});

const REPORT_COLOR: Record<ReportType, "primary" | "error" | "success"> = {
  DAILY: "primary",
  INCIDENT: "error",
  SESSION: "success",
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="overline" component="label" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
      {children}
      {required && <Box component="span" sx={{ color: "primary.main", ml: 0.5 }}>*</Box>}
    </Typography>
  );
}

function SectionHeading({ children, color = "primary.main" }: { children: React.ReactNode; color?: string }) {
  return (
    <Typography variant="overline" sx={{ color, display: "block", mb: 2 }}>
      {children}
    </Typography>
  );
}

export function DailyEntryForm({ userId, departmentId, initialReportType = "DAILY", students = [] }: Props) {
  const [reportType, setReportType] = React.useState<ReportType>(initialReportType);
  const [values, setValues] = React.useState<DailyEntryFormValues>(EMPTY(initialReportType));
  const [errors, setErrors] = React.useState<Partial<Record<keyof DailyEntryFormValues, string>>>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);

  function switchType(t: ReportType) {
    setReportType(t);
    setValues(EMPTY(t));
    setErrors({});
    setServerError(null);
    setStatus("idle");
  }

  function handleText(field: keyof DailyEntryFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function handleNumber(field: keyof DailyEntryFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === "" ? undefined : e.target.value;
      setValues((prev) => ({ ...prev, [field]: val }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = dailyEntryFormSchema.safeParse({ ...values, date: new Date(), reportType });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DailyEntryFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setStatus("submitting");
    setServerError(null);
    const result = await submitDailyEntry(userId, departmentId, parsed.data);
    if (result.success) {
      setStatus("success");
      setValues(EMPTY(reportType));
    } else {
      setStatus("error");
      setServerError(result.error);
    }
  }

  const accentColor = `${REPORT_COLOR[reportType]}.main`;

  if (status === "success") {
    const meta = REPORT_TYPES.find((r) => r.type === reportType)!;
    return (
      <Box sx={{ textAlign: "center", py: 8, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: `rgb(var(--mui-palette-success-mainChannel) / 0.1)`,
            border: "1px solid",
            borderColor: `rgb(var(--mui-palette-success-mainChannel) / 0.3)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: "1.25rem", lineHeight: 1, color: "success.main" }}>✓</Typography>
        </Box>
        <Typography variant="h5" sx={{ color: "text.primary", mb: 1 }}>
          {meta.label} submitted
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, maxWidth: 320, mx: "auto" }}>
          Your report is being processed. The intelligence layer will update shortly.
        </Typography>
        <Button variant="outlined" onClick={() => setStatus("idle")} sx={{ borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main" } }}>
          Submit another
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {/* ── Report type selector ── */}
        <Box>
          <FieldLabel required>Report Type</FieldLabel>
          <Stack spacing={1.5}>
            {REPORT_TYPES.map(({ type, label, description, color }) => {
              const selected = reportType === type;
              const paletteKey = color === "primary" ? "primary" : color === "error" ? "error" : "success";
              return (
                <Box
                  key={type}
                  onClick={() => switchType(type)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: selected
                      ? `rgb(var(--mui-palette-${paletteKey}-mainChannel) / 0.5)`
                      : "divider",
                    bgcolor: selected
                      ? `rgb(var(--mui-palette-${paletteKey}-mainChannel) / 0.05)`
                      : "background.paper",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: `rgb(var(--mui-palette-${paletteKey}-mainChannel) / 0.35)`,
                      bgcolor: `rgb(var(--mui-palette-${paletteKey}-mainChannel) / 0.03)`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2px solid",
                      borderColor: selected ? `${paletteKey}.main` : "text.secondary",
                      bgcolor: selected ? `${paletteKey}.main` : "transparent",
                      flexShrink: 0,
                      mt: 0.25,
                      transition: "all 0.15s",
                    }}
                  />
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: selected ? `${paletteKey}.main` : "text.primary", mb: 0.25 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {description}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Divider />

        {serverError && (
          <Alert severity="error" sx={{ bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.08)", color: "error.main", border: "1px solid", borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.2)", "& .MuiAlert-icon": { color: "error.main" } }}>
            {serverError}
          </Alert>
        )}

        {/* ── DAILY ── */}
        {reportType === "DAILY" && (
          <Box>
            <SectionHeading color={accentColor}>Daily Narrative</SectionHeading>
            <Stack spacing={2.5}>
              <Box>
                <FieldLabel required>Attendance Summary</FieldLabel>
                <TextField placeholder="e.g. 21 of 24 present. 3 excused absences." value={values.attendanceStatus} onChange={handleText("attendanceStatus")} error={!!errors.attendanceStatus} helperText={errors.attendanceStatus} fullWidth multiline minRows={2} size="small" />
              </Box>

              <Box>
                <FieldLabel required>Outputs Completed</FieldLabel>
                <TextField placeholder="e.g. 12 assignments reviewed, 2 lesson plans submitted" value={values.outputCompleted} onChange={handleText("outputCompleted")} error={!!errors.outputCompleted} helperText={errors.outputCompleted} fullWidth multiline minRows={2} size="small" />
              </Box>

              <Box>
                <FieldLabel>Engagement Notes</FieldLabel>
                <TextField placeholder="How was student engagement today?" value={values.engagementNotes} onChange={handleText("engagementNotes")} fullWidth multiline minRows={2} size="small" />
              </Box>

              <Box>
                <FieldLabel>Blockers</FieldLabel>
                <TextField placeholder="Any obstacles? Leave blank if none." value={values.blockers} onChange={handleText("blockers")} fullWidth multiline minRows={2} size="small" />
              </Box>

              {/* Guest visit */}
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: values.guestsVisited
                    ? "rgb(var(--mui-palette-primary-mainChannel) / 0.3)"
                    : "divider",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: values.guestsVisited
                    ? "rgb(var(--mui-palette-primary-mainChannel) / 0.03)"
                    : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
                      Guests visited the hub
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Toggle on if visitors, partners, or guests attended today
                    </Typography>
                  </Box>
                  <Switch
                    checked={values.guestsVisited}
                    onChange={(e) => {
                      setValues((p) => ({
                        ...p,
                        guestsVisited: e.target.checked,
                        guestNotes: e.target.checked ? p.guestNotes : undefined,
                      }));
                    }}
                    color="primary"
                  />
                </Box>
                {values.guestsVisited && (
                  <Box sx={{ mt: 1.5 }}>
                    <FieldLabel>Guest Description</FieldLabel>
                    <TextField
                      placeholder="Who came? e.g. 3 university recruiters, a local NGO partner…"
                      value={values.guestNotes ?? ""}
                      onChange={handleText("guestNotes")}
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                    />
                  </Box>
                )}
              </Box>

              {/* Dropout tracking */}
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: (values.dropoutStudentIds?.length ?? 0) > 0
                    ? "rgb(var(--mui-palette-error-mainChannel) / 0.3)"
                    : "divider",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: (values.dropoutStudentIds?.length ?? 0) > 0
                    ? "rgb(var(--mui-palette-error-mainChannel) / 0.03)"
                    : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <Box>
                  <FieldLabel>Students Who Dropped Out</FieldLabel>
                  {students.length > 0 ? (
                    <Autocomplete
                      multiple
                      options={students}
                      getOptionLabel={(s) => s.name}
                      value={students.filter((s) => (values.dropoutStudentIds ?? []).includes(s.id))}
                      onChange={(_, selected) => {
                        setValues((p) => ({
                          ...p,
                          dropoutStudentIds: selected.map((s) => s.id),
                          dropouts: selected.length || undefined,
                          dropoutReasons: selected.length === 0 ? undefined : Object.fromEntries(
                            Object.entries(p.dropoutReasons ?? {}).filter(([id]) => selected.some((s) => s.id === id))
                          ),
                        }));
                      }}
                      renderInput={(params) => {
                        const { InputLabelProps: _ilp, ...rest } = params;
                        return (
                          <TextField
                            {...rest}
                            size="small"
                            placeholder={values.dropoutStudentIds?.length ? "" : "Select students who dropped out…"}
                          />
                        );
                      }}
                      renderTags={(selected, getTagProps) =>
                        selected.map((s, i) => {
                          const { key: _k, ...tagProps } = getTagProps({ index: i });
                          return (
                            <Chip
                              key={s.id}
                              label={s.name}
                              size="small"
                              {...tagProps}
                              sx={{
                                bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.08)",
                                color: "error.main",
                                border: "1px solid",
                                borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.2)",
                                "& .MuiChip-deleteIcon": { color: "error.main" },
                                fontSize: "0.75rem",
                              }}
                            />
                          );
                        })
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ fontSize: "0.875rem" }}>{option.name}</Box>
                      )}
                      noOptionsText="No students found"
                      size="small"
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      No student roster found for this hub.
                    </Typography>
                  )}
                </Box>

                {/* Per-student reasons — only shown when at least one dropout is selected */}
                {(values.dropoutStudentIds?.length ?? 0) > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <FieldLabel>Reason for Dropout</FieldLabel>
                    <Stack spacing={1.5}>
                      {students
                        .filter((s) => (values.dropoutStudentIds ?? []).includes(s.id))
                        .map((s) => (
                          <Box key={s.id}>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                              {s.name}
                            </Typography>
                            <TextField
                              placeholder="e.g. Family relocation, financial hardship…"
                              value={(values.dropoutReasons ?? {})[s.id] ?? ""}
                              onChange={(e) => {
                                const reason = e.target.value;
                                setValues((p) => ({
                                  ...p,
                                  dropoutReasons: { ...(p.dropoutReasons ?? {}), [s.id]: reason },
                                }));
                              }}
                              fullWidth
                              size="small"
                            />
                          </Box>
                        ))}
                    </Stack>
                  </Box>
                )}
              </Box>

              <Box>
                <FieldLabel required>Quick Summary</FieldLabel>
                <TextField placeholder="1–2 sentence summary of today" value={values.quickSummary} onChange={handleText("quickSummary")} error={!!errors.quickSummary} helperText={errors.quickSummary} fullWidth multiline minRows={2} size="small" />
              </Box>
            </Stack>
          </Box>
        )}

        {/* ── INCIDENT ── */}
        {reportType === "INCIDENT" && (
          <Box>
            <SectionHeading color={accentColor}>Incident Details</SectionHeading>
            <Stack spacing={2.5}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box>
                  <FieldLabel required>Incident Type</FieldLabel>
                  <FormControl fullWidth size="small" error={!!errors.attendanceStatus}>
                    <Select displayEmpty value={values.attendanceStatus} onChange={(e) => { setValues((p) => ({ ...p, attendanceStatus: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.attendanceStatus; return n; }); }}>
                      <MenuItem value=""><em>Select type…</em></MenuItem>
                      <MenuItem value="Student Conflict">Student Conflict</MenuItem>
                      <MenuItem value="Safety Issue">Safety Issue</MenuItem>
                      <MenuItem value="Medical Emergency">Medical Emergency</MenuItem>
                      <MenuItem value="Equipment Failure">Equipment Failure</MenuItem>
                      <MenuItem value="Behavioral Issue">Behavioral Issue</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                    {errors.attendanceStatus && <Typography variant="caption" sx={{ color: "error.main", mt: 0.5, display: "block" }}>{errors.attendanceStatus}</Typography>}
                  </FormControl>
                </Box>
                <Box>
                  <FieldLabel>Severity</FieldLabel>
                  <FormControl fullWidth size="small">
                    <Select displayEmpty value={values.engagementScore ?? ""} onChange={(e) => { const v = e.target.value as "HIGH"|"MEDIUM"|"LOW"|""; setValues((p) => ({ ...p, engagementScore: v || undefined })); }}>
                      <MenuItem value=""><em>Select…</em></MenuItem>
                      <MenuItem value="LOW">Low</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="HIGH">High — requires escalation</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <Box>
                <FieldLabel>Students Involved</FieldLabel>
                {students.length > 0 ? (
                  <Autocomplete
                    multiple
                    options={students}
                    getOptionLabel={(s) => s.name}
                    value={students.filter((s) => (values.studentsInvolvedIds ?? []).includes(s.id))}
                    onChange={(_, selected) => {
                      setValues((p) => ({ ...p, studentsInvolvedIds: selected.map((s) => s.id), studentsPresent: selected.length || undefined }));
                    }}
                    renderInput={(params) => {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { InputLabelProps: _ilp, ...rest } = params;
                      return (
                        <TextField
                          {...rest}
                          size="small"
                          placeholder={values.studentsInvolvedIds?.length ? "" : "Search students…"}
                        />
                      );
                    }}
                    renderTags={(selected, getTagProps) =>
                      selected.map((s, i) => {
                        const { key: _k, ...tagProps } = getTagProps({ index: i });
                        return (
                          <Chip
                            key={s.id}
                            label={s.name}
                            size="small"
                            {...tagProps}
                            sx={{
                              bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.08)",
                              color: "error.main",
                              border: "1px solid",
                              borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.2)",
                              "& .MuiChip-deleteIcon": { color: "error.main" },
                              fontSize: "0.75rem",
                            }}
                          />
                        );
                      })
                    }
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ fontSize: "0.875rem" }}>
                        {option.name}
                      </Box>
                    )}
                    noOptionsText="No students found"
                    size="small"
                  />
                ) : (
                  <TextField type="number" inputProps={{ min: 0 }} placeholder="Number of students affected" value={values.studentsPresent ?? ""} onChange={handleNumber("studentsPresent")} fullWidth size="small" />
                )}
                {(values.studentsInvolvedIds?.length ?? 0) > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                    {values.studentsInvolvedIds!.length} student{values.studentsInvolvedIds!.length !== 1 ? "s" : ""} selected
                  </Typography>
                )}
              </Box>
              <Box>
                <FieldLabel required>Incident Description</FieldLabel>
                <TextField placeholder="Describe what happened — who, what, when, where." value={values.outputCompleted} onChange={handleText("outputCompleted")} error={!!errors.outputCompleted} helperText={errors.outputCompleted} fullWidth multiline minRows={4} size="small" />
              </Box>
              <Box>
                <FieldLabel required>Immediate Action Taken</FieldLabel>
                <TextField placeholder="What action did you take immediately? Who was notified?" value={values.blockers} onChange={handleText("blockers")} error={!!errors.blockers} helperText={errors.blockers} fullWidth multiline minRows={3} size="small" />
              </Box>
              <Box>
                <FieldLabel>Follow-up Required</FieldLabel>
                <TextField placeholder="What follow-up is needed? Leave blank if resolved." value={values.engagementNotes} onChange={handleText("engagementNotes")} fullWidth multiline minRows={2} size="small" />
              </Box>
              <Box>
                <FieldLabel required>Incident Summary</FieldLabel>
                <TextField placeholder="1–2 sentence summary for the record" value={values.quickSummary} onChange={handleText("quickSummary")} error={!!errors.quickSummary} helperText={errors.quickSummary} fullWidth multiline minRows={2} size="small" />
              </Box>
            </Stack>
          </Box>
        )}

        {/* ── SESSION ── */}
        {reportType === "SESSION" && (
          <>
            <Box>
              <SectionHeading color={accentColor}>Session Details</SectionHeading>
              <Stack spacing={2}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box>
                    <FieldLabel>Session Type</FieldLabel>
                    <FormControl fullWidth size="small">
                      <Select displayEmpty value={values.attendanceStatus} onChange={(e) => { setValues((p) => ({ ...p, attendanceStatus: e.target.value })); }}>
                        <MenuItem value=""><em>Select type…</em></MenuItem>
                        <MenuItem value="Workshop">Workshop</MenuItem>
                        <MenuItem value="Field Trip">Field Trip</MenuItem>
                        <MenuItem value="Guest Lecture">Guest Lecture</MenuItem>
                        <MenuItem value="Capstone Review">Capstone Review</MenuItem>
                        <MenuItem value="Peer Critique">Peer Critique</MenuItem>
                        <MenuItem value="Portfolio Review">Portfolio Review</MenuItem>
                        <MenuItem value="Other Special Session">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <FieldLabel>Student Response</FieldLabel>
                    <FormControl fullWidth size="small">
                      <Select displayEmpty value={values.engagementScore ?? ""} onChange={(e) => { const v = e.target.value as "HIGH"|"MEDIUM"|"LOW"|""; setValues((p) => ({ ...p, engagementScore: v || undefined })); }}>
                        <MenuItem value=""><em>Select…</em></MenuItem>
                        <MenuItem value="HIGH">High — highly engaged</MenuItem>
                        <MenuItem value="MEDIUM">Medium — moderate interest</MenuItem>
                        <MenuItem value="LOW">Low — low participation</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box>
                    <FieldLabel>Students Attended</FieldLabel>
                    <TextField type="number" inputProps={{ min: 0 }} placeholder="e.g. 22" value={values.studentsPresent ?? ""} onChange={handleNumber("studentsPresent")} fullWidth size="small" />
                  </Box>
                  <Box>
                    <FieldLabel>Total Students</FieldLabel>
                    <TextField type="number" inputProps={{ min: 0 }} placeholder="e.g. 24" value={values.totalStudents ?? ""} onChange={handleNumber("totalStudents")} fullWidth size="small" />
                  </Box>
                </Box>
              </Stack>
            </Box>
            <Divider />
            <Box>
              <SectionHeading color={accentColor}>Session Narrative</SectionHeading>
              <Stack spacing={2.5}>
                <Box>
                  <FieldLabel required>Session Outputs / Outcomes</FieldLabel>
                  <TextField placeholder="What was produced, learned, or accomplished?" value={values.outputCompleted} onChange={handleText("outputCompleted")} error={!!errors.outputCompleted} helperText={errors.outputCompleted} fullWidth multiline minRows={3} size="small" />
                </Box>
                <Box>
                  <FieldLabel>Student Engagement Notes</FieldLabel>
                  <TextField placeholder="How did students respond? Any standout moments?" value={values.engagementNotes} onChange={handleText("engagementNotes")} fullWidth multiline minRows={2} size="small" />
                </Box>
                <Box>
                  <FieldLabel>Blockers or Issues</FieldLabel>
                  <TextField placeholder="Any logistical problems, no-shows, or issues during the session?" value={values.blockers} onChange={handleText("blockers")} fullWidth multiline minRows={2} size="small" />
                </Box>
                <Box>
                  <FieldLabel required>Session Summary</FieldLabel>
                  <TextField placeholder="1–2 sentence summary for the record" value={values.quickSummary} onChange={handleText("quickSummary")} error={!!errors.quickSummary} helperText={errors.quickSummary} fullWidth multiline minRows={2} size="small" />
                </Box>
              </Stack>
            </Box>
          </>
        )}

        <Box sx={{ pt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={status === "submitting"}
            startIcon={status === "submitting" ? <CircularProgress size={16} color="inherit" /> : null}
            color={REPORT_COLOR[reportType]}
            sx={{ px: 4, py: 1.5 }}
          >
            {status === "submitting" ? "Submitting…" : `Submit ${REPORT_TYPES.find((r) => r.type === reportType)?.label}`}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
