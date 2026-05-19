"use client";

import { Box, Container, Typography, Button } from "@mui/material";

export default function DepartmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {error?.message || "An unexpected error occurred."}
        </Typography>
        {error?.digest && (
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 3, fontFamily: "monospace" }}>
            {error.digest}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button variant="outlined" onClick={reset} sx={{ textTransform: "none", borderRadius: 2 }}>
            Try Again
          </Button>
          <Button variant="contained" href="/login" sx={{ textTransform: "none", borderRadius: 2 }}>
            Back to Login
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
