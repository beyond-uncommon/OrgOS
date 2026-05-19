"use client";

import * as React from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
} from "@mui/material";
import { createAnnouncement } from "./actions";

interface Props {
  currentUserRole: string;
  currentDepartmentId: string | null;
  onSuccess: () => void;
}

export function CreateAnnouncementForm({ currentUserRole, currentDepartmentId, onSuccess }: Props) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [scope, setScope] = React.useState<"HUB" | "PROGRAM" | "ORG">("HUB");
  const [priority, setPriority] = React.useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [pinned, setPinned] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");

  const canPostProgram = ["BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "ADMIN"].includes(currentUserRole);
  const canPostOrg = ["COUNTRY_DIRECTOR", "ADMIN"].includes(currentUserRole);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const result = await createAnnouncement({
      title,
      body,
      scope,
      priority,
      pinned,
      tags,
      expiresAt: expiresAt || undefined,
      departmentId: currentDepartmentId ?? undefined,
    });

    if (result.success) {
      setStatus("success");
      setTitle("");
      setBody("");
      setScope("HUB");
      setPriority("NORMAL");
      setPinned(false);
      setTags([]);
      setExpiresAt("");
      setTimeout(() => {
        setStatus("idle");
        onSuccess();
      }, 1200);
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Failed to post");
    }
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.03)",
        p: 3,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2, color: "primary.main" }}>
        Post Announcement
      </Typography>

      {status === "success" && (
        <Alert severity="success" sx={{ mb: 2 }}>Announcement posted successfully!</Alert>
      )}
      {status === "error" && (
        <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          size="small"
          required
          fullWidth
          placeholder="e.g. New curriculum starting next month"
          inputProps={{ maxLength: 120 }}
        />

        <TextField
          label="Message"
          value={body}
          onChange={e => setBody(e.target.value)}
          size="small"
          required
          fullWidth
          multiline
          minRows={3}
          placeholder="Write your announcement here..."
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select
              value={scope}
              label="Scope"
              onChange={e => setScope(e.target.value as typeof scope)}
            >
              <MenuItem value="HUB">Hub only</MenuItem>
              {canPostProgram && <MenuItem value="PROGRAM">Program-wide</MenuItem>}
              {canPostOrg && <MenuItem value="ORG">Org-wide</MenuItem>}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={e => setPriority(e.target.value as typeof priority)}
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.5, display: "block" }}>
            Tags (press Enter or comma to add)
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {tags.map(t => (
              <Chip
                key={t}
                label={t}
                size="small"
                onDelete={() => setTags(tags.filter(x => x !== t))}
                sx={{ fontSize: "0.7rem" }}
              />
            ))}
          </Box>
          <TextField
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            size="small"
            fullWidth
            placeholder="training, deadline, celebration…"
            sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FormControlLabel
            control={<Switch checked={pinned} onChange={e => setPinned(e.target.checked)} color="primary" size="small" />}
            label={<Typography variant="caption">Pin to top</Typography>}
          />
          <TextField
            type="date"
            size="small"
            label="Expires (optional)"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" } }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button
            type="button"
            size="small"
            variant="outlined"
            onClick={() => setTitle("")}
            sx={{ fontSize: "0.75rem", textTransform: "none" }}
          >
            Clear
          </Button>
          <Button
            type="submit"
            size="small"
            variant="contained"
            disabled={status === "submitting" || !title.trim() || !body.trim()}
            sx={{ fontSize: "0.75rem", textTransform: "none" }}
          >
            {status === "submitting" ? "Posting…" : "Post Announcement"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}