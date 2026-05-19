"use client";

import * as React from "react";
import { Box, Typography, Button, ToggleButtonGroup, ToggleButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InboxIcon from "@mui/icons-material/Inbox";
import { AnnouncementCard } from "./AnnouncementCard";
import { CreateAnnouncementForm } from "./CreateAnnouncementForm";
import { createAnnouncement } from "./actions";

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

const CAN_POST = ["HUB_LEAD", "ADMIN", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR"];

interface Props {
  announcements: AnnouncementData[];
  currentUserRole: string;
  currentUserId: string;
  currentDepartmentId: string | null;
}

export function AnnouncementsList({ announcements, currentUserRole, currentUserId, currentDepartmentId }: Props) {
  const [filter, setFilter] = React.useState<string>("ALL");
  const [showCreate, setShowCreate] = React.useState(false);
  const canPost = CAN_POST.includes(currentUserRole);

  const pinned = announcements.filter(a => a.pinned);
  const unpinned = announcements.filter(a => !a.pinned);

  const filtered = (list: AnnouncementData[]) => {
    if (filter === "ALL") return list;
    return list.filter(a => a.scope === filter);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h6" sx={{ color: "text.primary" }}>
            Announcements
          </Typography>
          {announcements.length > 0 && (
            <Box sx={{
              width: 20, height: 20, borderRadius: "50%", bgcolor: "primary.main",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Typography variant="caption" sx={{ color: "white", fontWeight: 700, fontSize: "0.6rem" }}>
                {announcements.length}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { fontSize: "0.65rem", py: 0.5, px: 1.5, textTransform: "none" } }}
          >
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="HUB">Hub</ToggleButton>
            <ToggleButton value="PROGRAM">Program</ToggleButton>
            <ToggleButton value="ORG">Org-wide</ToggleButton>
          </ToggleButtonGroup>
          {canPost && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreate(!showCreate)}
              sx={{ fontSize: "0.7rem", textTransform: "none", py: 0.5 }}
            >
              Post
            </Button>
          )}
        </Box>
      </Box>

      {showCreate && (
        <Box sx={{ mb: 3 }}>
          <CreateAnnouncementForm
            currentUserRole={currentUserRole}
            currentDepartmentId={currentDepartmentId}
            onSuccess={() => setShowCreate(false)}
          />
        </Box>
      )}

      {announcements.length === 0 ? (
        <Box sx={{
          textAlign: "center", py: 4, border: "1px dashed", borderColor: "divider",
          borderRadius: 2, bgcolor: "background.paper"
        }}>
          <InboxIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No announcements yet
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered(pinned).length > 0 && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Pinned
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
              </Box>
              {filtered(pinned).map(a => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </>
          )}
          {filtered(unpinned).length > 0 && (
            <>
              {filtered(pinned).length > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Recent
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
                </Box>
              )}
              {filtered(unpinned).map(a => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}