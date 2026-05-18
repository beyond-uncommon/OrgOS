import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Box, Container, Typography } from "@mui/material";

export default async function InsightsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Insights</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          AI-generated insights from your daily operational data.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Insights module — coming soon.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}