"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { requestEntryEdit } from "../actions/requestEntryEdit";

interface EditRequest {
  id: string;
  status: string;
  note: string;
  reviewNote: string | null;
  createdAt: Date;
}

interface Props {
  entryId: string;
  userId: string;
  existingRequest: EditRequest | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Edit Requested",
  APPROVED: "Edit Approved",
  DENIED: "Edit Denied",
};

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  DENIED: "error",
};

export function RequestEditButton({ entryId, userId, existingRequest }: Props) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const request = submitted ? { status: "PENDING" } : existingRequest;

  if (request) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip
          label={STATUS_LABEL[request.status] ?? request.status}
          size="small"
          color={STATUS_COLOR[request.status] ?? "default"}
          variant="outlined"
          sx={{ fontSize: "0.7rem" }}
        />
        {request.status === "DENIED" && "reviewNote" in request && request.reviewNote && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
            {request.reviewNote}
          </Typography>
        )}
      </Box>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await requestEntryEdit(entryId, userId, note);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      setOpen(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen(true)}
        sx={{
          fontSize: "0.7rem",
          py: 0.25,
          px: 1,
          borderColor: "divider",
          color: "text.secondary",
          "&:hover": { borderColor: "primary.main", color: "primary.main" },
        }}
      >
        Request Edit
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Request Permission to Edit</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            Your department head will review and approve or deny the request.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
              Reason for Edit (optional)
            </Typography>
            <TextField
              placeholder="e.g. Incorrect attendance figure, missed adding blockers…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              size="small"
            />
            {error && (
              <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} size="small" sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="small"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={12} color="inherit" /> : null}
          >
            {submitting ? "Sending…" : "Send Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
