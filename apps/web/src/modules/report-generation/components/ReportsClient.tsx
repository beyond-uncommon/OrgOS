"use client";

import * as React from "react";
import {
  Box, Typography, Container, Stack, Button,
  Chip, Alert, CircularProgress, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider,
} from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import { approveWeeklyReport } from "@/modules/report-generation/actions/approveWeeklyReport";
import { approveDailyReport } from "@/modules/report-generation/actions/approveDailyReport";

type DailyReportRow = {
  id: string;
  date: Date;
  status: string;
  promptVersion: string;
  generatedContent: object;
  generatedMetrics: object;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

type WeeklyReportRow = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  status: string;
  promptVersion: string;
  generatedContent: object;
  generatedMetrics: object;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

type MonthlyReportRow = {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  promptVersion: string;
  generatedContent: object;
  generatedMetrics: object;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

interface Props {
  dailyReports: DailyReportRow[];
  weeklyReports: WeeklyReportRow[];
  monthlyReports: MonthlyReportRow[];
}

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "info"> = {
  DRAFT: "warning",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  PUBLISHED: "default",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ReportContentDialog({ open, onClose, content }: {
  open: boolean;
  onClose: () => void;
  content: object;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
        Report Content
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {Object.entries(content).map(([key, value]) => (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {key.replace(/([A-Z])/g, " $1").trim()}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
              </Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function DailyReportsTab({ reports }: { reports: DailyReportRow[] }) {
  const [selected, setSelected] = React.useState<DailyReportRow | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [approving, setApproving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, setRefresh] = React.useState(0);

  async function handleApprove(id: string) {
    setApproving(id);
    setError(null);
    const result = await approveDailyReport(id);
    setApproving(null);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {reports.length === 0 ? (
        <EmptyState message="No daily reports generated yet" />
      ) : (
        <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Generated</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Reviewed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDate(report.date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABEL[report.status] ?? report.status}
                      size="small"
                      color={STATUS_COLOR[report.status] ?? "default"}
                      sx={{ fontSize: "0.625rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatDate(report.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {report.reviewedAt ? (
                      <Typography variant="caption" sx={{ color: "success.main" }}>
                        {formatDate(report.reviewedAt)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileOpenIcon sx={{ fontSize: 14 }} />}
                        onClick={() => { setSelected(report); setDialogOpen(true); }}
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}
                      >
                        View
                      </Button>
                      {report.status === "DRAFT" && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={approving === report.id ? <CircularProgress size={10} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleApprove(report.id)}
                          disabled={approving === report.id}
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}
                        >
                          Approve
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ReportContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        content={selected?.generatedContent ?? {}}
      />
    </>
  );
}

function WeeklyReportsTab({ reports }: { reports: WeeklyReportRow[] }) {
  const [selected, setSelected] = React.useState<WeeklyReportRow | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [approving, setApproving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, setRefresh] = React.useState(0);

  async function handleApprove(id: string) {
    setApproving(id);
    setError(null);
    const result = await approveWeeklyReport(id);
    setApproving(null);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {reports.length === 0 ? (
        <EmptyState message="No weekly reports generated yet" />
      ) : (
        <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Generated</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Reviewed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDate(report.weekStart)} — {formatDate(report.weekEnd)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABEL[report.status] ?? report.status}
                      size="small"
                      color={STATUS_COLOR[report.status] ?? "default"}
                      sx={{ fontSize: "0.625rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatDate(report.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {report.reviewedAt ? (
                      <Typography variant="caption" sx={{ color: "success.main" }}>
                        {formatDate(report.reviewedAt)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileOpenIcon sx={{ fontSize: 14 }} />}
                        onClick={() => { setSelected(report); setDialogOpen(true); }}
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}
                      >
                        View
                      </Button>
                      {report.status === "DRAFT" && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={approving === report.id ? <CircularProgress size={10} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleApprove(report.id)}
                          disabled={approving === report.id}
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}
                        >
                          Approve
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ReportContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        content={selected?.generatedContent ?? {}}
      />
    </>
  );
}

function MonthlyReportsTab({ reports }: { reports: MonthlyReportRow[] }) {
  const [selected, setSelected] = React.useState<MonthlyReportRow | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      {reports.length === 0 ? (
        <EmptyState message="No monthly reports generated yet" />
      ) : (
        <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Generated</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Reviewed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {new Date(report.periodYear, report.periodMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABEL[report.status] ?? report.status}
                      size="small"
                      color={STATUS_COLOR[report.status] ?? "default"}
                      sx={{ fontSize: "0.625rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatDate(report.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {report.reviewedAt ? (
                      <Typography variant="caption" sx={{ color: "success.main" }}>
                        {formatDate(report.reviewedAt)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileOpenIcon sx={{ fontSize: 14 }} />}
                      onClick={() => { setSelected(report); setDialogOpen(true); }}
                      sx={{ fontSize: "0.7rem", textTransform: "none" }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ReportContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        content={selected?.generatedContent ?? {}}
      />
    </>
  );
}

export function ReportsClient({ dailyReports, weeklyReports, monthlyReports }: Props) {
  const [tab, setTab] = React.useState(0);

  const draftCount = weeklyReports.filter((r) => r.status === "DRAFT").length + dailyReports.filter((r) => r.status === "DRAFT").length;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Button
              component={Link}
              href="/submit"
              size="small"
              variant="contained"
              sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 2, py: 0.6 }}
            >
              Submit
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Reports</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Auto-generated daily, weekly, and monthly reports from your daily entries and extracted metrics.
          </Typography>
        </Box>

        {draftCount > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {draftCount} report{draftCount > 1 ? "s" : ""} awaiting review and approval.
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`Daily (${dailyReports.length})`} />
            <Tab label={`Weekly (${weeklyReports.length})`} />
            <Tab label={`Monthly (${monthlyReports.length})`} />
          </Tabs>
        </Box>

        {tab === 0 ? <DailyReportsTab reports={dailyReports} /> : tab === 1 ? <WeeklyReportsTab reports={weeklyReports} /> : <MonthlyReportsTab reports={monthlyReports} />}
      </Container>
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <FileOpenIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" sx={{ color: "text.secondary" }}>{message}</Typography>
      <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
        Reports are auto-generated every Sunday and on the 1st of each month.
      </Typography>
    </Box>
  );
}