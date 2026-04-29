"use client";

import * as React from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import type { PendingActionRow } from "@/modules/approvals/queries";
import { approvePendingAction, rejectPendingAction } from "@/modules/approvals/actions/resolveAction";

const URGENCY_CONFIG = {
  IMMEDIATE: { colorToken: "error.main",    channel: "var(--mui-palette-error-mainChannel)"   },
  "24H":     { colorToken: "warning.main",  channel: "var(--mui-palette-warning-mainChannel)" },
  "7D":      { colorToken: "text.secondary", channel: null },
} as const;

const PRIORITY_LABEL: Record<number, string> = { 0: "P0", 1: "P1", 2: "P2", 3: "P3" };

interface Props {
  actions: PendingActionRow[];
  approverId: string;
}

export function ApprovalQueuePanel({ actions, approverId }: Props) {
  const router = useRouter();
  const [resolving, setResolving] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    id: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  async function handleApprove(actionId: string) {
    setResolving(actionId);
    const result = await approvePendingAction(actionId, approverId);
    setResolving(null);
    if (result.success) {
      setFeedback({ id: actionId, message: "Approved.", type: "success" });
      router.refresh();
    } else {
      setFeedback({ id: actionId, message: result.error, type: "error" });
    }
  }

  async function handleReject(actionId: string) {
    setResolving(actionId);
    const result = await rejectPendingAction(actionId, approverId);
    setResolving(null);
    if (result.success) {
      setFeedback({ id: actionId, message: "Rejected.", type: "success" });
      router.refresh();
    } else {
      setFeedback({ id: actionId, message: result.error, type: "error" });
    }
  }

  if (actions.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No actions pending approval
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {actions.map((action) => {
        const urgencyCfg = URGENCY_CONFIG[action.urgency as keyof typeof URGENCY_CONFIG];
        const isResolving = resolving === action.id;

        return (
          <Box
            key={action.id}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}
          >
            {/* Header strip */}
            <Box
              sx={{
                px: 2,
                py: 1,
                bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.05)",
                borderBottom: "1px solid",
                borderBottomColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="overline" sx={{ color: "primary.main" }}>
                  {PRIORITY_LABEL[action.priority] ?? "P?"}
                </Typography>
                {urgencyCfg && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: urgencyCfg.colorToken }} />
                    <Typography variant="overline" sx={{ color: urgencyCfg.colorToken }}>
                      {action.urgency === "7D" ? "7 Days" : action.urgency}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                exp {new Date(action.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Typography>
            </Box>

            {/* Body */}
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "text.primary", mb: 1 }}>
                {action.actionType.replace(/_/g, " ")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                {action.rationale}
              </Typography>

              {feedback?.id === action.id && (
                <Alert
                  severity={feedback.type}
                  sx={{
                    mb: 1.5,
                    py: 0,
                    bgcolor: feedback.type === "success"
                      ? "rgb(var(--mui-palette-success-mainChannel) / 0.08)"
                      : "rgb(var(--mui-palette-error-mainChannel) / 0.08)",
                    color: feedback.type === "success" ? "success.main" : "error.main",
                    border: "1px solid",
                    borderColor: feedback.type === "success"
                      ? "rgb(var(--mui-palette-success-mainChannel) / 0.2)"
                      : "rgb(var(--mui-palette-error-mainChannel) / 0.2)",
                    "& .MuiAlert-icon": { color: "inherit" },
                  }}
                >
                  {feedback.message}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={isResolving}
                  startIcon={isResolving ? <CircularProgress size={12} color="inherit" /> : null}
                  onClick={() => handleApprove(action.id)}
                  sx={{ flex: 1, py: 1 }}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={isResolving}
                  onClick={() => handleReject(action.id)}
                  sx={{
                    flex: 1,
                    py: 1,
                    borderColor: "divider",
                    color: "text.secondary",
                    "&:hover": {
                      borderColor: "error.main",
                      color: "error.main",
                      bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.05)",
                    },
                  }}
                >
                  Reject
                </Button>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
