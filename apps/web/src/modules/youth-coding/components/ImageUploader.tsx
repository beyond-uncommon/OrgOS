"use client";

import * as React from "react";
import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  images: string[];
  onChange: (urls: string[]) => void;
}

export function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) continue;
        const { url } = await res.json();
        newUrls.push(url);
      } catch { continue; }
    }
    onChange([...images, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
        Photos
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
        {images.map((url, i) => (
          <Box
            key={url}
            sx={{
              position: "relative",
              width: 80, height: 80,
              borderRadius: 1.5,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={url}
              alt=""
              sx={{ width: 1, height: 1, objectFit: "cover" }}
            />
            <IconButton
              size="small"
              onClick={() => remove(i)}
              sx={{
                position: "absolute", top: 1, right: 1,
                bgcolor: "rgba(0,0,0,0.5)",
                color: "white",
                width: 20, height: 20,
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ))}
        {uploading && (
          <Box sx={{ width: 80, height: 80, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 1.5,
          py: 1.5,
          textAlign: "center",
          cursor: "pointer",
          "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
          transition: "all 0.15s",
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {uploading ? "Uploading…" : images.length > 0 ? "Add more photos" : "Tap to add photos"}
        </Typography>
      </Box>
    </Box>
  );
}
