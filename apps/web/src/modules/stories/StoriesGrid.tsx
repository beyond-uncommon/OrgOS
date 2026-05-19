"use client";

import * as React from "react";
import { Box, Typography, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { StoryCard } from "./StoryCard";

type StorySummary = {
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

type StoriesGridProps = {
  stories: StorySummary[];
  title?: string;
  showFeaturedBadge?: boolean;
  onStoryClick?: (story: StorySummary) => void;
};

export function StoriesGrid({
  stories,
  title,
  showFeaturedBadge = true,
  onStoryClick,
}: StoriesGridProps) {
  return (
    <Box>
      {title && (
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {title}
        </Typography>
      )}

      {stories.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No stories found.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {stories.map((story) => (
            <Grid key={story.id} size={{ xs: 12, sm: 6, md: 4 }}>
              {onStoryClick ? (
                <StoryCard story={story} onClick={() => onStoryClick(story)} showFeaturedBadge={showFeaturedBadge} />
              ) : (
                <StoryCard story={story} showFeaturedBadge={showFeaturedBadge} />
              )}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}