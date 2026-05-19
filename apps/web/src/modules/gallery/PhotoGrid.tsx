"use client";
import * as React from "react";
import { Box, Typography, ImageList, ImageListItem, ImageListItemBar, IconButton, Dialog, DialogContent, Chip } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

interface Photo {
  id: string; url: string; caption: string; credit: string; eventName: string;
  eventDate: Date; program: string; tags: string[]; featured: boolean; createdAt: Date;
  department?: { name: string } | null;
}

interface Props { photos: Photo[]; title?: string; program?: string }

function PhotoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent sx={{ p: 0, position: "relative", bgcolor: "black" }}>
        <Box component="img" src={photo.url} alt={photo.caption} sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }} />
        <Box sx={{ p: 2, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2">{photo.eventName}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{photo.caption}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Chip label={photo.program} size="small" />
            {photo.credit && <Typography variant="caption" sx={{ color: "text.disabled" }}>Photo: {photo.credit}</Typography>}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function PhotoGrid({ photos, title, program }: Props) {
  const [selected, setSelected] = React.useState<Photo | null>(null);

  if (photos.length === 0) return null;

  return (
    <Box sx={{ mb: 5 }}>
      {title && (
        <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, overflow: "hidden" }}>
        <ImageList variant="masonry" cols={3} gap={8}>
          {photos.map((photo) => (
            <ImageListItem
              key={photo.id}
              onClick={() => setSelected(photo)}
              sx={{
                cursor: "pointer",
                borderRadius: 1,
                overflow: "hidden",
                "&:hover .MuiImageListItem-root": { opacity: 0.85 },
                "&:hover .MuiImageListItemBar-root": { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={photo.url}
                alt={photo.caption}
                loading="lazy"
                sx={{ width: "100%", display: "block", transition: "transform 0.2s", "&:hover": { transform: "scale(1.02)" } }}
              />
              <ImageListItemBar
                title={photo.eventName}
                subtitle={photo.caption.slice(0, 40) + (photo.caption.length > 40 ? "…" : "")}
                sx={{
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  ".MuiImageListItem-root:hover &": { opacity: 1 },
                }}
                actionIcon={
                  <IconButton sx={{ color: "white" }} size="small">
                    <OpenInFullIcon fontSize="small" />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
      {selected && <PhotoModal photo={selected} onClose={() => setSelected(null)} />}
    </Box>
  );
}