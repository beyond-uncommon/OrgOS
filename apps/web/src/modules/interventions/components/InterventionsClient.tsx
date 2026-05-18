"use client";

import * as React from "react";
import {
  Box, Chip, Typography, Container, Stack, Button,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Divider,
} from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { resolveIntervention, updateInterventionStatus } from "@/modules/interventions/actions/resolveIntervention";
import type { Intervention, Alert as AlertType, InterventionStatus } from "@orgos/db";

type InterventionWithRelations = Intervention & {
  alert: AlertType;
  assignedTo: { id: string; name: string };
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info" | "default"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
};

const STATUS_CHIP_COLOR: Record<string, "error" | "warning" | "success" | "default"> = {
  OPEN: "error",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface InterventionCardProps {
  intervention: InterventionWithRelations;
  onResolve: (id: string) => void;
  onProgress: (id: string) => void;
}

function InterventionCard({ intervention, onResolve, onProgress }: InterventionCardProps) {
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  async function handleResolve() {
    setSubmitting(true);
    await onResolve(intervention.id);
    setSubmitting(false);
    setDialogOpen(false);
  }

  return (
    <>
      <Box
        sx={{
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <WarningAmberIcon sx={{ color: `${SEVERITY_COLOR[intervention.severity]}.main`, fontSize: 20 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                {intervention.issueType.replace(/_/g, " ")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {formatRelativeTime(intervention.createdAt)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
              label={intervention.severity}
              size="small"
              color={SEVERITY_COLOR[intervention.severity] ?? "default"}
              sx={{ fontSize: "0.625rem", fontWeight: 700 }}
            />
            <Chip
              label={STATUS_LABEL[intervention.status]}
              size="small"
              color={STATUS_CHIP_COLOR[intervention.status] ?? "default"}
              sx={{ fontSize: "0.625rem", fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Alert type */}
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          Alert: {intervention.alert.type.replace(/_/g, " ")} · ID: {intervention.alert.id.slice(0, 8)}
        </Typography>

        {/* Assigned to */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Assigned to:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
            {intervention.assignedTo.name}
          </Typography>
        </Box>

        {/* Notes */}
        {intervention.notes && (
          <Box sx={{ bgcolor: "grey.50", borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>Notes</Typography>
            <Typography variant="body2" sx={{ color: "text.primary" }}>{intervention.notes}</Typography>
          </Box>
        )}

        {/* Actions */}
        {intervention.status !== "RESOLVED" && (
          <Box sx={{ display: "flex", gap: 1.5 }}>
            {intervention.status === "OPEN" && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => onProgress(intervention.id)}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Mark In Progress
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={submitting ? <CircularProgress size={12} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
              onClick={() => setDialogOpen(true)}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Resolve
            </Button>
          </Box>
        )}
      </Box>

      {/* Resolve Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
          Resolve Intervention
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Add resolution notes for: {intervention.issueType.replace(/_/g, " ")}.
          </Typography>
          <TextField
            label="Resolution Notes"
            multiline
            rows={3}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What action was taken? How was this resolved?"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? "Resolving..." : "Resolve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface Props {
  interventions: InterventionWithRelations[];
  userRole: string;
  userId: string;
  userDepartmentId: string | null;
}

export function InterventionsClient({ interventions, userRole, userId, userDepartmentId }: Props) {
  const [filter, setFilter] = React.useState<InterventionStatus | "ALL">("ALL");
  const [error, setError] = React.useState<string | null>(null);
  const [, setRefresh] = React.useState(0);

  const filtered = filter === "ALL"
    ? interventions
    : interventions.filter((i) => i.status === filter);

  async function handleResolve(id: string) {
    setError(null);
    const result = await resolveIntervention(id);
    if (!result.success) {
      setError(result.error ?? "Failed to resolve intervention");
    } else {
      setRefresh((n) => n + 1);
    }
  }

  async function handleProgress(id: string) {
    setError(null);
    const result = await updateInterventionStatus(id, "IN_PROGRESS" as InterventionStatus);
    if (!result.success) {
      setError(result.error ?? "Failed to update status");
    } else {
      setRefresh((n) => n + 1);
    }
  }

  const openCount = interventions.filter((i) => i.status === "OPEN").length;
  const inProgressCount = interventions.filter((i) => i.status === "IN_PROGRESS").length;
  const resolvedCount = interventions.filter((i) => i.status === "RESOLVED").length;

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                component={Link}
                href="/submit"
                size="small"
                variant="contained"
                sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 2, py: 0.6, letterSpacing: "0.02em" }}
              >
                Submit
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>
            Interventions
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Track and resolve interventions for detected risks and anomalies across your department.
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ display: "flex", gap: 3, mb: 4, flexWrap: "wrap" }}>
          {[
            { label: "Open", count: openCount, color: "error" },
            { label: "In Progress", count: inProgressCount, color: "warning" },
            { label: "Resolved", count: resolvedCount, color: "success" },
          ].map(({ label, count, color }) => (
            <Box
              key={label}
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                px: 3,
                py: 2,
                minWidth: 120,
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>{count}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Filter tabs */}
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((f) => (
            <Chip
              key={f}
              label={f === "ALL" ? "All" : STATUS_LABEL[f]}
              onClick={() => setFilter(f)}
              variant={filter === f ? "filled" : "outlined"}
              color={filter === f ? "primary" : "default"}
              sx={{ fontSize: "0.75rem", cursor: "pointer" }}
            />
          ))}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.main", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: "text.secondary" }}>
              {filter === "ALL" ? "No interventions yet" : `No ${STATUS_LABEL[filter as InterventionStatus]?.toLowerCase()} interventions`}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
              {filter === "ALL"
                ? "The system will create interventions when anomalies are detected."
                : "Try selecting a different filter."}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {filtered.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onResolve={handleResolve}
                onProgress={handleProgress}
              />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}