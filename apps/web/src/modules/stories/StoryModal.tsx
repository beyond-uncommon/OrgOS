"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";

type StoryDetail = {
  id: string;
  title: string;
  excerpt?: string | null;
  body: string;
  authorName: string;
  authorRole?: string | null;
  studentAge?: string | null;
  studentProgram?: string | null;
  heroImage?: string | null;
  tags: string[];
  featured?: boolean;
  createdAt: Date;
  department?: { name: string } | null;
};

type StoryModalProps = {
  story: StoryDetail | null;
  open: boolean;
  onClose: () => void;
};

const GRADIENT_PALETTES = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

function getGradient(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length]!;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function renderBody(text: string): React.ReactNode[] {
  return text.split(/\n\n+/).map((para, i) => (
    <Typography key={i} variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
      {para}
    </Typography>
  ));
}

export function StoryModal({ story, open, onClose }: StoryModalProps) {
  if (!story) return null;

  const gradient = getGradient(story.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box
        sx={{
          height: 280,
          backgroundImage: story.heroImage ? `url(${story.heroImage})` : gradient,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(0,0,0,0.5)",
            color: "common.white",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogTitle sx={{ pt: 2, pb: 1, fontSize: "1.4rem", fontWeight: 600 }}>
        {story.title}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={1} mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {story.authorName}
              {story.authorRole && ` · ${story.authorRole}`}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarTodayIcon sx={{ fontSize: 14, color: "text.disabled" }} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(story.createdAt)}
              {story.department && ` · ${story.department.name}`}
            </Typography>
          </Stack>

          {(story.studentAge || story.studentProgram) && (
            <Typography variant="caption" color="text.secondary">
              {story.studentProgram}
              {story.studentAge && ` · Age ${story.studentAge}`}
            </Typography>
          )}
        </Stack>

        {story.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} mb={3} flexWrap="wrap" useFlexGap>
            {story.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ height: 24 }} />
            ))}
          </Stack>
        )}

        <Divider sx={{ mb: 3 }} />

        <Box>{renderBody(story.body)}</Box>
      </DialogContent>
    </Dialog>
  );
}