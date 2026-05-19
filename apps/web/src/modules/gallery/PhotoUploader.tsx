"use client";
import * as React from "react";
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, Stack, Typography, Alert } from "@mui/material";
import { prisma } from "@orgos/db";
import { revalidatePath } from "next/cache";

const PROGRAMS = ["Youth Coding", "Bootcamp", "Teacher Training", "Outreach"] as const;

async function createPhoto(data: FormData) {
  "use server";
  const eventName = data.get("eventName") as string;
  const eventDate = new Date(data.get("eventDate") as string);
  const program = data.get("program") as string;
  const url = data.get("url") as string;
  const caption = data.get("caption") as string;
  const credit = data.get("credit") as string;
  const tagsStr = data.get("tags") as string;
  const featured = data.get("featured") === "on";

  const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];

  await prisma.photo.create({
    data: { eventName, eventDate, program, url, caption, credit, tags, featured },
  });

  revalidatePath("/impact");
}

export function PhotoUploader() {
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setSuccess(false);
    try {
      await createPhoto(formData);
      setSuccess(true);
      (document.getElementById("photo-form") as HTMLFormElement).reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload Photo</Typography>
      {success && <Alert severity="success" sx={{ mb: 2 }}>Photo uploaded successfully!</Alert>}
      <form id="photo-form" action={handleSubmit}>
        <Stack spacing={2}>
          <TextField name="eventName" label="Event Name" required fullWidth size="small" />
          <TextField name="eventDate" label="Event Date" type="date" required fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth size="small">
            <InputLabel>Program</InputLabel>
            <Select name="program" label="Program" required defaultValue="">
              {PROGRAMS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField name="url" label="Image URL" required fullWidth size="small" placeholder="https://..." />
          <TextField name="caption" label="Caption" multiline rows={2} fullWidth size="small" />
          <TextField name="credit" label="Photo Credit" fullWidth size="small" placeholder="Photographer name" />
          <TextField name="tags" label="Tags" fullWidth size="small" placeholder="comma-separated: workshop, graduation, event" />
          <FormControlLabel control={<Switch name="featured" />} label="Featured" />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Uploading..." : "Upload Photo"}
          </Button>
        </Stack>
      </form>
    </Box>
  );
}