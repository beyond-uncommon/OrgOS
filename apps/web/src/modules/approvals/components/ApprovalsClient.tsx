"use client";

import * as React from "react";
import {
  Box, Typography, Container, Stack, Button,
  Chip, Alert, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { approvePendingAction, rejectPendingAction } from "@/modules/approvals/actions/resolveAction";
import { reviewEditRequest } from "@/modules/daily-inputs/actions/reviewEditRequest";

type EditRequestRow = {
  id: string;
  note: string;
  createdAt: Date;
  entry: {
    id: string;
    date: Date;
    quickSummary: string;
    reportType: string;
    user: { id: string; name: string };
  };
  requestedBy: { id: string; name: string };
};

type PendingActionRow = {
  id: string;
  actionType: string;
  rationale: string;
  priority: number;
  urgency: string;
  expiresAt: Date;
  createdAt: Date;
};

interface Props {
  editRequests: EditRequestRow[];
  pendingActions: PendingActionRow[];
  userRole: string;
  userDepartmentId: string | null;
}

const URGENCY_COLOR: Record<string, "error" | "warning" | "info"> = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EditRequestCard({ req, onApprove, onDeny }: {
  req: EditRequestRow;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  return (
    <>
      <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditNoteOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Edit Request
            </Typography>
          </Box>
          <Chip label={req.entry.reportType} size="small" sx={{ fontSize: "0.625rem" }} />
        </Box>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          <strong>{req.requestedBy.name}</strong>{" "}requested an edit on{" "}
          <strong>{req.entry.user.name}</strong>&apos;s entry from {formatDate(req.entry.date)}
        </Typography>

        {req.note && (
          <Box sx={{ bgcolor: "grey.50", borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Reason</Typography>
            <Typography variant="body2">{req.note}</Typography>
          </Box>
        )}

        <Box sx={{ bgcolor: "background.default", borderRadius: 1, p: 2, mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Original entry</Typography>
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", mt: 0.5 }}>
            {req.entry.quickSummary || "No summary"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={submitting ? <CircularProgress size={12} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => setDialogOpen(true)}
            sx={{ fontSize: "0.75rem", textTransform: "none" }}
          >
            Review
          </Button>
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>Review Edit Request</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 3, mt: 1 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => { setSubmitting(true); onApprove(req.id); }}
              disabled={submitting}
              sx={{ flex: 1 }}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => { setSubmitting(true); onDeny(req.id); }}
              disabled={submitting}
              sx={{ flex: 1 }}
            >
              Deny
            </Button>
          </Box>
          <TextField
            label="Review Note (optional)"
            multiline
            rows={2}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add a note about your decision..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function PendingActionCard({ action, onApprove, onReject }: {
  action: PendingActionRow;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{action.actionType}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={PRIORITY_LABEL[action.priority] ?? `P${action.priority}`}
            size="small"
            color={action.priority <= 2 ? "error" : action.priority === 3 ? "warning" : "default"}
            sx={{ fontSize: "0.625rem" }}
          />
          <Chip
            label={action.urgency}
            size="small"
            color={URGENCY_COLOR[action.urgency] ?? "default"}
            sx={{ fontSize: "0.625rem" }}
          />
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>{action.rationale}</Typography>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          Expires {formatDate(action.expiresAt)}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setSubmitting(true); onApprove(action.id); }}
            disabled={submitting}
            sx={{ fontSize: "0.7rem", textTransform: "none" }}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setSubmitting(true); onReject(action.id); }}
            disabled={submitting}
            sx={{ fontSize: "0.7rem", textTransform: "none" }}
          >
            Reject
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export function ApprovalsClient({ editRequests, pendingActions, userRole, userDepartmentId }: Props) {
  const [tab, setTab] = React.useState<"requests" | "actions">("requests");
  const [error, setError] = React.useState<string | null>(null);
  const [, setRefresh] = React.useState(0);

  async function handleApproveEdit(id: string) {
    setError(null);
    const result = await reviewEditRequest(id, "APPROVED" as never, "");
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

  async function handleDenyEdit(id: string) {
    setError(null);
    const result = await reviewEditRequest(id, "DENIED" as never, "");
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

  async function handleApproveAction(id: string) {
    setError(null);
    const result = await approvePendingAction(id);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

  async function handleRejectAction(id: string) {
    setError(null);
    const result = await rejectPendingAction(id);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setRefresh((n) => n + 1);
  }

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
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Approvals</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Review pending edit requests and approve or reject system-generated actions.
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ display: "flex", gap: 1, mb: 4 }}>
          <Chip
            label={`Edit Requests (${editRequests.length})`}
            onClick={() => setTab("requests")}
            variant={tab === "requests" ? "filled" : "outlined"}
            color={tab === "requests" ? "primary" : "default"}
            sx={{ cursor: "pointer", fontSize: "0.8rem" }}
          />
          <Chip
            label={`Pending Actions (${pendingActions.length})`}
            onClick={() => setTab("actions")}
            variant={tab === "actions" ? "filled" : "outlined"}
            color={tab === "actions" ? "primary" : "default"}
            sx={{ cursor: "pointer", fontSize: "0.8rem" }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        {tab === "requests" && (
          editRequests.length === 0 ? (
            <EmptyState message="No pending edit requests" />
          ) : (
            <Stack spacing={2}>
              {editRequests.map((req) => (
                <EditRequestCard
                  key={req.id}
                  req={req}
                  onApprove={handleApproveEdit}
                  onDeny={handleDenyEdit}
                />
              ))}
            </Stack>
          )
        )}

        {tab === "actions" && (
          pendingActions.length === 0 ? (
            <EmptyState message="No pending actions" />
          ) : (
            <Stack spacing={2}>
              {pendingActions.map((action) => (
                <PendingActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                />
              ))}
            </Stack>
          )
        )}
      </Container>
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.main", mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" sx={{ color: "text.secondary" }}>{message}</Typography>
      <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>Nothing needs your attention right now.</Typography>
    </Box>
  );
}