"use client";

import { Box, Container, Typography, Button } from "@mui/material";

export default function PortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F9FAFB" }}>
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: "#111827" }}>
          Something went wrong
        </Typography>
        <Typography variant="body1" sx={{ color: "#6B7280", mb: 4 }}>
          We couldn&apos;t load the portal. Please try again.
        </Typography>
        <Button variant="contained" onClick={reset}
          sx={{ textTransform: "none", bgcolor: "#047857", "&:hover": { bgcolor: "#065F46" }, borderRadius: 2 }}>
          Try Again
        </Button>
      </Container>
    </Box>
  );
}