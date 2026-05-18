import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma, MetricSource } from "@orgos/db";
import { Box, Typography, Container, Alert, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import Button from "@mui/material/Button";

export default async function MetricsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { role, departmentId, id: userId } = sessionUser;

  if (role === "INSTRUCTOR") {
    redirect(`/departments/${departmentId}/instructors/${userId}`);
  }

  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  const [metrics, summary] = await Promise.all([
    accessibleIds.length > 0
      ? prisma.extractedMetric.findMany({
          where: { entry: { departmentId: { in: accessibleIds } } },
          include: {
            entry: {
              select: { date: true, quickSummary: true, departmentId: true, user: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.extractedMetric.groupBy({
          by: ["metricKey", "source"],
          where: { entry: { departmentId: { in: accessibleIds } } },
          _count: true,
          orderBy: { _count: "desc" } as never,
        })
      : Promise.resolve([]),
  ]);

  const sourceLabels: Record<MetricSource, string> = {
    STRUCTURED: "Structured",
    NARRATIVE: "AI Narrative",
    INFERRED: "Inferred",
  };

  const sourceColors: Record<MetricSource, "default" | "info" | "warning"> = {
    STRUCTURED: "default",
    NARRATIVE: "info",
    INFERRED: "warning",
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Button
              component={Link}
              href="/submit"
              size="small"
              variant="contained"
              sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 2, py: 0.6 }}
            >
              Submit
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Metrics</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Structured and AI-extracted metrics from daily entries across your departments.
          </Typography>
        </Box>

        {/* Metric summary */}
        {summary.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Metric Summary</Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 4 }}>
              {summary.map((s) => (
                <Box key={`${s.metricKey}-${s.source}`} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>{s.metricKey}</Typography>
                    <Chip label={sourceLabels[s.source]} size="small" color={sourceColors[s.source]} sx={{ fontSize: "0.5rem" }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{s._count}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>extractions</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Recent extractions */}
        {metrics.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Extractions</Typography>
            <TableContainer component={Paper} sx={{ border: "1px solid", borderColor: "divider" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Metric</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Value</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Confidence</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Author</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.metricKey}</Typography>
                        {m.flagged && (
                          <Chip label="Flagged" size="small" color="warning" sx={{ fontSize: "0.5rem", mt: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {JSON.stringify(m.metricValue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 4,
                              borderRadius: 2,
                              bgcolor: m.confidence >= 0.8 ? "success.main" : m.confidence >= 0.6 ? "warning.main" : "error.main",
                              opacity: m.confidence,
                            }}
                          />
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {(m.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={sourceLabels[m.source]} size="small" color={sourceColors[m.source]} sx={{ fontSize: "0.625rem" }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {new Date(m.entry.date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {m.entry.user?.name ?? "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Empty state */}
        {metrics.length === 0 && summary.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <SearchIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: "text.secondary" }}>No metrics extracted yet</Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
              Metrics are extracted when daily entries are submitted. Start submitting reports to build up your metrics data.
            </Typography>
            <Button component={Link} href="/submit" variant="contained" sx={{ mt: 3 }}>
              Submit First Report
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}