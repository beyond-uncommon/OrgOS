import { prisma } from "@orgos/db";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CheckInPanel } from "@/modules/youth-coding/components/CheckInPanel";
import { Box, Container, Typography } from "@mui/material";
import { getOrCreateTodaySession } from "@/modules/youth-coding/actions/markHubAttendance";

interface Props {
  params: Promise<{ departmentId: string }>;
}

export default async function HubAttendancePage({ params }: Props) {
  const { departmentId } = await params;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true },
  });
  if (!department) notFound();

  const session = await getOrCreateTodaySession(departmentId);

  const students = await prisma.student.findMany({
    where: { departmentId, enrollmentStatus: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkinUrl = `${baseUrl}/yc/checkin?token=${session.token}`;
  const qrSvg = await QRCode.toString(checkinUrl, { type: "svg", margin: 2, width: 300 });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="sm">
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              {department.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            sx={{
              display: "inline-block",
              bgcolor: "white",
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
            Scan to check in from your phone
          </Typography>
        </Box>

        <CheckInPanel
          sessionId={session.id}
          sessionToken={session.token}
          deviceIP={session.deviceIP}
          students={students}
          initialRecords={session.records.map(r => ({
            studentId: r.studentId,
            studentName: r.student.name,
            checkedInAt: r.checkedInAt.toISOString(),
          }))}
        />
      </Container>
    </Box>
  );
}
