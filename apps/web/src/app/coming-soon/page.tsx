import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { getSessionUser } from "@/lib/auth/session";
import { UserBar } from "@/components/UserBar";

export default async function ComingSoonPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
          </Box>
        </Container>
      </Box>
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <Typography variant="h4" sx={{ color: "text.primary", mb: 2, letterSpacing: "-0.02em" }}>
          Dashboard coming soon
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
          {sessionUser.name} — {sessionUser.role}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Your role&apos;s dashboard is being built. Check back soon.
        </Typography>
      </Container>
    </Box>
  );
}
