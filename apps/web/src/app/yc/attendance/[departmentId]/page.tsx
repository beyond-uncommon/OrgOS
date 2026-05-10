import { prisma } from "@orgos/db";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CheckInPanel } from "@/modules/youth-coding/components/CheckInPanel";
import { Box, Container, Typography, Collapse, Button } from "@mui/material";
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
  const qrSvg = await QRCode.toString(checkinUrl, { type: "svg", margin: 2, width: 200 });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="md">
          <Box sx={{ py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ letterSpacing: "-0.01em", lineHeight: 1.2 }}>
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
            <Box sx={{ textAlign: "center" }}>
              <Box
                sx={{ display: "inline-block", bgcolor: "white", p: 0.5, borderRadius: 1, border: "1px solid", borderColor: "divider", lineHeight: 0 }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.3, color: "text.disabled", fontSize: "0.6rem" }}>
                QR setup
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <CheckInPanel
          sessionId={session.id}
          departmentId={departmentId}
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
