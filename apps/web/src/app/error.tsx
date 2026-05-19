"use client";

import { Box, Container, Typography, Button } from "@mui/material";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F9FAFB" }}>
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: "#111827" }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" sx={{ color: "#6B7280", mb: 1, fontFamily: "monospace", fontSize: "0.75rem" }}>
          {error?.message || "Unknown error"}
        </Typography>
        {error?.digest && (
          <Typography variant="caption" sx={{ color: "#9CA3AF", display: "block", mb: 3 }}>
            Digest: {error.digest}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button variant="outlined" onClick={reset} sx={{ textTransform: "none", borderRadius: 2 }}>
            Try Again
          </Button>
          <Button variant="contained" href="/login" sx={{ textTransform: "none", bgcolor: "#111827", "&:hover": { bgcolor: "#374151" }, borderRadius: 2 }}>
            Back to Login
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
