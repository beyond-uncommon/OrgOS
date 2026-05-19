"use client";

import * as React from "react";
import { Box, Typography, Chip, Divider } from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";

interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  scope: "HUB" | "PROGRAM" | "ORG";
  tags: string[];
  pinned: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  author: { name: string };
  department?: { name: string } | null;
}

interface Props {
  announcement: AnnouncementData;
  onPin?: (id: string) => void;
}

const PRIORITY_CONFIG = {
  LOW: { color: "default" as const, label: "Low", pulse: false },
  NORMAL: { color: "info" as const, label: "Normal", pulse: false },
  HIGH: { color: "warning" as const, label: "High", pulse: false },
  URGENT: { color: "error" as const, label: "Urgent", pulse: true },
};

const SCOPE_COLORS = {
  HUB: "#6B7280",
  PROGRAM: "#2563EB",
  ORG: "#047857",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnnouncementCard({ announcement: a }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const cfg = PRIORITY_CONFIG[a.priority];

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: a.priority === "URGENT"
          ? "rgb(var(--mui-palette-error-mainChannel) / 0.3)"
          : "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: "pointer",
        "&:hover": {
          borderColor: a.priority === "URGENT"
            ? "error.main"
            : "primary.main",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        },
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Box sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1, gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
            {a.pinned && (
              <PushPinIcon sx={{ fontSize: 14, color: "primary.main", flexShrink: 0 }} />
            )}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.title}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Chip
              label={cfg.label}
              size="small"
              color={cfg.color}
              sx={{
                fontSize: "0.55rem",
                height: 18,
                ...(cfg.pulse ? {
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.7 },
                  },
                } : {}),
              }}
            />
            <Chip
              label={a.scope}
              size="small"
              sx={{
                fontSize: "0.55rem",
                height: 18,
                bgcolor: SCOPE_COLORS[a.scope] + "18",
                color: SCOPE_COLORS[a.scope],
              }}
            />
          </Box>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {a.body}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {a.author.name}
            {a.department ? ` · ${a.department.name}` : ""}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {formatDate(a.createdAt)}
          </Typography>
          {a.tags.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {a.tags.slice(0, 3).map(t => (
                <Chip key={t} label={t} size="small" sx={{ height: 16, fontSize: "0.55rem" }} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}