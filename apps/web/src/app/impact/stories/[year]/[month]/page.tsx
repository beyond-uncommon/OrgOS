import { prisma } from "@orgos/db";
import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ year: string; month: string }>;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function ImpactStoryPage({ params }: Props) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) notFound();

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [reports, sessions, entries, students, hubs] = await Promise.all([
    prisma.studentReport.findMany({
      where: { date: { gte: start, lte: end } },
      include: { student: { select: { name: true, department: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
    prisma.youthCodingSession.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        attendance: { select: { projectStatus: true, studentId: true } },
        department: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.dailyEntry.findMany({
      where: { date: { gte: start, lte: end }, reportType: "SESSION" },
      select: { quickSummary: true, date: true, departmentId: true },
      orderBy: { date: "asc" },
    }),
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
    prisma.department.findMany({
      where: { parent: { name: "Youth Coding Program" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const allPhotos = reports.flatMap((r) => {
    const urls = (r as unknown as { imageUrls?: string[] }).imageUrls ?? [];
    return urls.map((url: string) => ({ url, studentName: r.student.name, date: r.date }));
  });

  const totalAttendance = sessions.flatMap((s) => s.attendance);
  const completions = totalAttendance.filter((a) => a.projectStatus === "COMPLETE").length;
  const completionRate = totalAttendance.length > 0 ? Math.round((completions / totalAttendance.length) * 100) : 0;
  const uniqueStudents = new Set(totalAttendance.map((a) => a.studentId)).size;
  const totalSessions = sessions.length;
  const totalReports = reports.length;
  const avgRating = reports.length > 0 ? Math.round((reports.reduce((s, r) => s + r.rating, 0) / reports.length) * 10) / 10 : 0;
  const hubNames = hubs.map((h) => h.name);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              {" "}Impact
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography component={Link} href="/impact" variant="caption" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                Dashboard
              </Typography>
              <Typography component={Link} href="/yc/feedback" variant="caption" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                Submit Feedback
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ fontSize: "2.25rem", fontWeight: 700, color: "text.primary", mb: 1, letterSpacing: "-0.02em" }}>
          {MONTHS[month - 1]} {year}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 5, maxWidth: 600 }}>
          A look back at what our youth coding students learned, built, and shared this month.
        </Typography>

        {/* Metrics strip */}
        <Grid container spacing={2} sx={{ mb: 5 }}>
          {[
            { label: "Active Students", value: String(students) },
            { label: "Sessions Held", value: String(totalSessions) },
            { label: "Reports Submitted", value: String(totalReports) },
            { label: "Unique Attendees", value: String(uniqueStudents) },
            { label: "Completion Rate", value: `${completionRate}%` },
            { label: "Avg Rating", value: String(avgRating) },
          ].map((m) => (
            <Grid key={m.label} size={{ xs: 6, sm: 4, md: 2 }}>
              <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, textAlign: "center" }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main", lineHeight: 1.2, mb: 0.5 }}>
                  {m.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {m.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Photo gallery */}
        {allPhotos.length > 0 && (
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
              Moments captured this month
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
              {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""} shared by students
            </Typography>
            <Grid container spacing={1.5}>
              {allPhotos.map((photo, i) => (
                <Grid key={`${photo.url}-${i}`} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      "&:hover": { "& .overlay": { opacity: 1 } },
                    }}
                  >
                    <Box
                      component="img"
                      src={photo.url}
                      alt={`Photo by ${photo.studentName}`}
                      sx={{ width: 1, height: 200, objectFit: "cover", display: "block" }}
                    />
                    <Box
                      className="overlay"
                      sx={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        bgcolor: "rgba(0,0,0,0.6)",
                        px: 1.5, py: 1,
                        opacity: 0,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "white", display: "block", fontWeight: 600 }}>
                        {photo.studentName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.65rem" }}>
                        {new Date(photo.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* No photos state */}
        {allPhotos.length === 0 && (
          <Box sx={{ mb: 5, py: 6, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
              No photos shared this month
            </Typography>
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              Photos appear here when students submit reports with images.
            </Typography>
          </Box>
        )}

        {/* Hubs */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", mb: 1 }}>
            Hubs involved
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {hubNames.map((name) => (
              <Box key={name} sx={{ px: 2, py: 0.75, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText" }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{name}</Typography>
              </Box>
            ))}
            {hubNames.length === 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>No active hubs</Typography>
            )}
          </Box>
        </Box>

        {/* Session highlights */}
        {entries.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}>
              Session highlights
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {entries.slice(0, 10).map((entry, i) => (
                <Box
                  key={`${entry.date.toISOString()}-${i}`}
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    borderLeft: "3px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 0.5 }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {entry.quickSummary}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Student voices */}
        {reports.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
              Student voices
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
              What students said they learned this month
            </Typography>
            <Grid container spacing={2}>
              {reports.slice(0, 12).map((report) => (
                <Grid key={report.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2.5,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {report.student.name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.3 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Box
                            key={star}
                            sx={{
                              width: 8, height: 8,
                              borderRadius: "50%",
                              bgcolor: star <= report.rating ? "warning.main" : "action.hover",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, flex: 1 }}>
                      &ldquo;{report.learned}&rdquo;
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.disabled", mt: 1 }}>
                      {new Date(report.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ mt: 6, pt: 4, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between" }}>
          <Box>
            {month > 1 ? (
              <Typography component={Link} href={`/impact/stories/${year}/${month - 1}`} variant="body2" sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                ← {MONTHS[month - 2]} {month === 2 && year === new Date().getFullYear() ? "" : ""}
              </Typography>
            ) : (
              <Typography component={Link} href={`/impact/stories/${year - 1}/12`} variant="body2" sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                ← {MONTHS[11]} {year - 1}
              </Typography>
            )}
          </Box>
          <Box>
            {month < 12 ? (
              <Typography component={Link} href={`/impact/stories/${year}/${month + 1}`} variant="body2" sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                {MONTHS[month]} →
              </Typography>
            ) : (
              <Typography component={Link} href={`/impact/stories/${year + 1}/1`} variant="body2" sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                {MONTHS[0]} {year + 1} →
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
