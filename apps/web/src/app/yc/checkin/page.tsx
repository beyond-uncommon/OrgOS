import { prisma } from "@orgos/db";
import { redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function QRCheckInPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: "text.secondary" }}>
            Invalid QR code
          </Typography>
        </Container>
      </Box>
    );
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { token },
    select: { id: true, departmentId: true, isActive: true },
  });

  if (!session || !session.isActive) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ color: "text.secondary" }}>
            This QR code is no longer valid
          </Typography>
        </Container>
      </Box>
    );
  }

  redirect(`/yc/attendance/${session.departmentId}?token=${token}`);
}
