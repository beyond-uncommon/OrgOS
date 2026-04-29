"use client";

import * as React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { addEntryComment } from "../actions/addEntryComment";
import { reviewEditRequest } from "../actions/reviewEditRequest";

interface Comment {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; role: string };
}

interface EditRequest {
  id: string;
  status: string;
  note: string;
  reviewNote: string | null;
  createdAt: Date;
}

interface Props {
  entryId: string;
  reviewerId: string;
  reviewerRole: string;
  initialComments: Comment[];
  editRequest: EditRequest | null;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function EntryFeedbackPanel({ entryId, reviewerId, reviewerRole, initialComments, editRequest }: Props) {
  const [comments, setComments] = React.useState<Comment[]>(initialComments);
  const [body, setBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [commentError, setCommentError] = React.useState<string | null>(null);

  const [request, setRequest] = React.useState<EditRequest | null>(editRequest);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);

  async function handleComment() {
    setPosting(true);
    setCommentError(null);
    const result = await addEntryComment(entryId, reviewerId, body);
    setPosting(false);
    if (result.success) {
      setComments((prev) => [
        ...prev,
        {
          id: result.data.id,
          body: body.trim(),
          createdAt: new Date(),
          author: { id: reviewerId, name: "You", role: reviewerRole },
        },
      ]);
      setBody("");
    } else {
      setCommentError(result.error);
    }
  }

  async function handleReview(decision: "APPROVED" | "DENIED") {
    setReviewing(true);
    const result = await reviewEditRequest(request!.id, reviewerId, decision, reviewNote || undefined);
    setReviewing(false);
    if (result.success) {
      setRequest((prev) => prev ? { ...prev, status: decision, reviewNote: reviewNote || null } : prev);
    }
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Edit request review */}
      {request && request.status === "PENDING" && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "rgb(var(--mui-palette-warning-mainChannel) / 0.3)",
            bgcolor: "rgb(var(--mui-palette-warning-mainChannel) / 0.04)",
          }}
        >
          <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600, display: "block", mb: 0.5 }}>
            Edit Request
          </Typography>
          {request.note && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
              "{request.note}"
            </Typography>
          )}
          <TextField
            placeholder="Optional note to instructor…"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={reviewing}
              onClick={() => handleReview("APPROVED")}
              startIcon={reviewing ? <CircularProgress size={10} color="inherit" /> : null}
              sx={{ fontSize: "0.7rem", py: 0.5 }}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={reviewing}
              onClick={() => handleReview("DENIED")}
              sx={{ fontSize: "0.7rem", py: 0.5 }}
            >
              Deny
            </Button>
          </Box>
        </Box>
      )}

      {request && request.status !== "PENDING" && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: request.status === "APPROVED" ? "success.main" : "error.main", fontWeight: 600 }}>
            Edit {request.status === "APPROVED" ? "Approved" : "Denied"}
          </Typography>
          {request.reviewNote && (
            <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
              — {request.reviewNote}
            </Typography>
          )}
        </Box>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  mt: 0.1,
                }}
              >
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "primary.main", lineHeight: 1 }}>
                  {c.author.name.charAt(0).toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.72rem" }}>
                    {c.author.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.68rem" }}>
                    {timeAgo(c.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                  {c.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 1.5, opacity: 0.5 }} />

      {/* Comment input */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => { setBody(e.target.value); setCommentError(null); }}
          size="small"
          fullWidth
          multiline
          maxRows={4}
          error={!!commentError}
          helperText={commentError}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) handleComment();
          }}
          sx={{ "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
        />
        <Button
          variant="contained"
          size="small"
          disabled={!body.trim() || posting}
          onClick={handleComment}
          sx={{ flexShrink: 0, minWidth: 64, fontSize: "0.7rem", py: 0.75 }}
        >
          {posting ? <CircularProgress size={12} color="inherit" /> : "Post"}
        </Button>
      </Box>
    </Box>
  );
}
