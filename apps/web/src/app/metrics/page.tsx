import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Box, Container, Typography } from "@mui/material";

export default async function MetricsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Metrics</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Explore extracted metrics from your daily entries.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Metrics module — coming soon.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}