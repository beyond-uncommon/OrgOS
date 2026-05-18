import { Box, Container, Typography } from "@mui/material";
import { prisma } from "@orgos/db";
import { StudentReportForm } from "@/modules/youth-coding/components/StudentReportForm";

interface Props {
  searchParams: Promise<{ departmentId?: string }>;
}

export default async function StudentFeedbackPage({ searchParams }: Props) {
  const { departmentId } = await searchParams;

  const students = departmentId
    ? await prisma.student.findMany({
        where: { departmentId, enrollmentStatus: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              {" "}Feedback
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 6 }}>
        {!departmentId ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              No hub selected. Ask your coordinator for the feedback link.
            </Typography>
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              No students found for this hub.
            </Typography>
          </Box>
        ) : (
          <StudentReportForm students={students} />
        )}
      </Container>
    </Box>
  );
}
