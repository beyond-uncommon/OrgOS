import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Box, Container, Typography } from "@mui/material";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Reports</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          View auto-generated weekly and monthly reports.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Reports module — coming soon.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}