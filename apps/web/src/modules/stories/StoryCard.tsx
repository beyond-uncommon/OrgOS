"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

type StoryCardProps = {
  story: {
    id: string;
    title: string;
    excerpt: string | null;
    authorName: string;
    authorRole?: string | null;
    studentAge?: string | null;
    studentProgram?: string | null;
    heroImage?: string | null;
    tags: string[];
    featured?: boolean;
    viewCount?: number;
    createdAt: Date;
    department?: { name: string } | null;
  };
  onClick?: () => void;
  showFeaturedBadge?: boolean;
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StoryCard({ story, onClick, showFeaturedBadge = true }: StoryCardProps) {
  const gradient = getGradient(story.id);

  return (
    <Paper
      onClick={onClick}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: 4,
            }
          : {},
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          height: 180,
          backgroundImage: story.heroImage ? `url(${story.heroImage})` : gradient,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {showFeaturedBadge && story.featured && (
          <Chip
            icon={<StarIcon sx={{ fontSize: 14 }} />}
            label="Featured"
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              bgcolor: "rgba(0,0,0,0.65)",
              color: "common.white",
              fontSize: "0.7rem",
              height: 24,
            }}
          />
        )}
      </Box>

      <Stack spacing={1.5} p={2} sx={{ flex: 1 }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: "1rem", fontWeight: 600, lineHeight: 1.3 }}>
          {story.title}
        </Typography>

        {story.excerpt && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              flex: 1,
            }}
          >
            {story.excerpt}
          </Typography>
        )}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">
            {story.authorName}
            {story.authorRole && ` · ${story.authorRole}`}
          </Typography>
        </Stack>

        {story.department && (
          <Typography variant="caption" color="text.secondary">
            {story.department.name}
          </Typography>
        )}

        {story.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {story.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{ height: 20, fontSize: "0.65rem" }}
              />
            ))}
          </Stack>
        )}

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <CalendarTodayIcon sx={{ fontSize: 12, color: "text.disabled" }} />
          <Typography variant="caption" color="text.disabled">
            {formatDate(story.createdAt)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}