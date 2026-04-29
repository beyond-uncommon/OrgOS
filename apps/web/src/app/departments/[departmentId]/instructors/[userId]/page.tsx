import { notFound } from "next/navigation";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import Link from "next/link";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import {
  getInstructorProfile,
  getInstructorDailyEntries,
  getInstructorAlerts,
  getStudentsForInstructor,
} from "@/modules/dashboards/instructor/queries";
import { InstructorTabs } from "@/modules/dashboards/instructor/InstructorTabs";
import { UserBar } from "@/components/UserBar";
import { RequestEditButton } from "@/modules/daily-inputs/components/RequestEditButton";
import { EntryFeedbackPanel } from "@/modules/daily-inputs/components/EntryFeedbackPanel";
import type { Alert } from "@orgos/db";

interface Props {
  params: Promise<{ departmentId: string; userId: string }>;
}

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info" | "success" | "default"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
};

const ENGAGEMENT_COLOR: Record<string, string> = {
  HIGH: "success.main",
  MEDIUM: "warning.main",
  LOW: "error.main",
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: accent ? "rgb(var(--mui-palette-primary-mainChannel) / 0.3)" : "divider",
        borderRadius: 2,
        p: 2.5,
        position: "relative",
        overflow: "hidden",
        ...(accent && {
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: "primary.main",
          },
        }),
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: accent ? "primary.main" : "text.primary", fontWeight: 600, lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
      {children}
    </Typography>
  );
}

export default async function InstructorPage({ params }: Props) {
  const { departmentId, userId } = await params;

  const [instructor, entries, rawAlerts, students] = await Promise.all([
    getInstructorProfile(userId),
    getInstructorDailyEntries(userId, 30),
    getInstructorAlerts(userId),
    getStudentsForInstructor(userId),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  if (!instructor || instructor.departmentId !== departmentId) notFound();

  const sessionUser = await import("@/lib/auth/session").then((m) => m.getSessionUser());
  const isOwnProfile = sessionUser?.id === userId;
  const isDeptHead = sessionUser?.role === "HUB_LEAD" || sessionUser?.role === "ADMIN";
  const alerts = rawAlerts as Alert[];

  // ── Aggregate hub metrics from structured fields ────────────────────────
  const entriesWithData = entries.filter((e) => e.totalStudents !== null);
  const latestEntry = entriesWithData[0];

  const avgAttendanceRate = (() => {
    const rates = entries
      .filter((e) => e.totalStudents && e.studentsPresent)
      .map((e) => e.studentsPresent! / e.totalStudents!);
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  })();

  const totalDropouts = entries.reduce((sum, e) => sum + (e.dropouts ?? 0), 0);
  const totalMentorshipPairs = latestEntry?.mentorshipPairs ?? null;
  const avgAge = latestEntry?.averageAge ?? null;

  const latestEngagement = entries.find((e) => e.engagementScore)?.engagementScore ?? null;

  const genderBreakdown = (() => {
    const e = entries.find((e) => e.maleStudents !== null || e.femaleStudents !== null);
    if (!e) return null;
    const total = (e.maleStudents ?? 0) + (e.femaleStudents ?? 0) + (e.otherGender ?? 0);
    if (!total) return null;
    return {
      male: e.maleStudents ?? 0,
      female: e.femaleStudents ?? 0,
      other: e.otherGender ?? 0,
      total,
    };
  })();

  // ── Extracted metric fallbacks ──────────────────────────────────────────
  const extractedAttendance = avgAttendanceRate ?? (() => {
    const rates = entries.flatMap((e) =>
      e.extractedMetrics
        .filter((m) => m.metricKey === "attendance_rate")
        .map((m) => Number(m.metricValue))
    );
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  })();

  const outputCounts = entries.flatMap((e) =>
    e.extractedMetrics
      .filter((m) => m.metricKey === "output_count")
      .map((m) => Number(m.metricValue))
  );
  const totalOutputs = outputCounts.reduce((a, b) => a + b, 0);

  // ── Build tab content ───────────────────────────────────────────────────
  const metricsTab = (
    <Box>
      {/* Hub overview stats */}
      <SectionLabel>Hub Overview</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total Students"
            value={latestEntry?.totalStudents != null ? String(latestEntry.totalStudents) : "—"}
            sub="current enrollment"
            accent
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Avg Attendance"
            value={extractedAttendance !== null ? `${Math.round(extractedAttendance * 100)}%` : "—"}
            sub="30-day average"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Dropouts"
            value={String(totalDropouts)}
            sub="last 30 days"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Mentorship Pairs"
            value={totalMentorshipPairs !== null ? String(totalMentorshipPairs) : "—"}
            sub="latest entry"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Average Age"
            value={avgAge !== null ? `${avgAge.toFixed(1)} yrs` : "—"}
            sub="latest entry"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Engagement"
            value={latestEngagement ?? "—"}
            sub="most recent entry"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Entries (30d)"
            value={String(entries.length)}
            sub="of 30 days"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total Outputs"
            value={String(totalOutputs)}
            sub="last 30 days"
          />
        </Grid>
      </Grid>

      {/* Gender breakdown */}
      {genderBreakdown && (
        <Box sx={{ mb: 4 }}>
          <SectionLabel>Gender Breakdown (Latest)</SectionLabel>
          <Box
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 3,
            }}
          >
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[
                { label: "Male", count: genderBreakdown.male, color: "primary.main" },
                { label: "Female", count: genderBreakdown.female, color: "secondary.main" },
                { label: "Other", count: genderBreakdown.other, color: "text.secondary" },
              ].map(({ label, count, color }) => (
                <Box key={label} sx={{ minWidth: 80 }}>
                  <Typography variant="h4" sx={{ color, fontWeight: 600, lineHeight: 1 }}>
                    {count}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {label} · {genderBreakdown.total > 0 ? Math.round((count / genderBreakdown.total) * 100) : 0}%
                  </Typography>
                </Box>
              ))}
            </Box>
            {/* Visual bar */}
            <Box sx={{ mt: 2.5, height: 8, borderRadius: 4, overflow: "hidden", display: "flex", gap: "2px" }}>
              {genderBreakdown.male > 0 && (
                <Box
                  sx={{
                    flex: genderBreakdown.male,
                    bgcolor: "primary.main",
                    borderRadius: "4px 0 0 4px",
                    opacity: 0.8,
                  }}
                />
              )}
              {genderBreakdown.female > 0 && (
                <Box sx={{ flex: genderBreakdown.female, bgcolor: "secondary.main", opacity: 0.8 }} />
              )}
              {genderBreakdown.other > 0 && (
                <Box
                  sx={{
                    flex: genderBreakdown.other,
                    bgcolor: "text.secondary",
                    borderRadius: "0 4px 4px 0",
                    opacity: 0.5,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Engagement trend — last 10 entries */}
      {entries.length > 0 && (
        <Box>
          <SectionLabel>Recent Engagement Trend</SectionLabel>
          <Box
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 3,
            }}
          >
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {entries.slice(0, 10).reverse().map((entry) => {
                const eng = entry.engagementScore
                  ?? (entry.extractedMetrics.find((m) => m.metricKey === "engagement_score")?.metricValue as string | undefined);
                const color =
                  eng === "HIGH" ? "success.main"
                  : eng === "LOW" ? "error.main"
                  : eng === "MEDIUM" ? "warning.main"
                  : "divider";
                return (
                  <Box key={entry.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: eng ? `rgb(var(--mui-palette-${eng === "HIGH" ? "success" : eng === "LOW" ? "error" : "warning"}-mainChannel) / 0.15)` : "action.hover",
                        border: "1px solid",
                        borderColor: eng ? color : "divider",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.55rem" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
              {[
                { label: "High", color: "success.main" },
                { label: "Medium", color: "warning.main" },
                { label: "Low", color: "error.main" },
              ].map(({ label, color }) => (
                <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: color }} />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  const historyTab = (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {entries.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No entries in the last 30 days.
          </Typography>
        </Box>
      ) : (
        <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
          {entries.map((entry) => {
            const eng = entry.engagementScore
              ?? (entry.extractedMetrics.find((m) => m.metricKey === "engagement_score")?.metricValue as string | undefined);
            const rType = (entry.reportType ?? "DAILY") as "DAILY" | "INCIDENT" | "SESSION";
            const reportMeta = {
              DAILY:    { label: "Daily",    paletteKey: "primary",  borderColor: "rgb(var(--mui-palette-primary-mainChannel) / 0.3)" },
              INCIDENT: { label: "Incident", paletteKey: "error",    borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.3)" },
              SESSION:  { label: "Session",  paletteKey: "success",  borderColor: "rgb(var(--mui-palette-success-mainChannel) / 0.3)" },
            }[rType];

            return (
              <Box
                key={entry.id}
                sx={{
                  px: 3,
                  py: 2.5,
                  borderLeft: rType !== "DAILY" ? "3px solid" : "none",
                  borderLeftColor: rType === "INCIDENT" ? "error.main" : rType === "SESSION" ? "success.main" : "transparent",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                    {rType !== "DAILY" && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: reportMeta.borderColor,
                          bgcolor: `rgb(var(--mui-palette-${reportMeta.paletteKey}-mainChannel) / 0.07)`,
                        }}
                      >
                        <Typography variant="overline" sx={{ color: `${reportMeta.paletteKey}.main`, fontSize: "0.575rem", lineHeight: 1 }}>
                          {reportMeta.label}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {entry.studentsPresent !== null && entry.totalStudents !== null && (
                      <Chip
                        label={`${entry.studentsPresent}/${entry.totalStudents} present`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.6875rem" }}
                      />
                    )}
                    {entry.dropouts !== null && entry.dropouts > 0 && (
                      <Chip
                        label={`${entry.dropouts} dropout${entry.dropouts !== 1 ? "s" : ""}`}
                        size="small"
                        color="warning"
                        sx={{ fontSize: "0.6875rem" }}
                      />
                    )}
                    {eng && (
                      <Chip
                        label={eng}
                        size="small"
                        sx={{
                          fontSize: "0.6875rem",
                          bgcolor: `rgb(var(--mui-palette-${eng === "HIGH" ? "success" : eng === "LOW" ? "error" : "warning"}-mainChannel) / 0.1)`,
                          color: ENGAGEMENT_COLOR[eng] ?? "text.secondary",
                          borderColor: `rgb(var(--mui-palette-${eng === "HIGH" ? "success" : eng === "LOW" ? "error" : "warning"}-mainChannel) / 0.3)`,
                          border: "1px solid",
                        }}
                      />
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  {entry.quickSummary}
                </Typography>
                {/* Incident: involved students */}
                {rType === "INCIDENT" && (() => {
                  const ids = entry.studentsInvolvedIds as string[] | null;
                  if (!ids?.length) return null;
                  const names = ids.map((id) => studentMap.get(id)).filter(Boolean);
                  if (!names.length) return null;
                  return (
                    <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>Involved:</Typography>
                      {names.map((name) => (
                        <Box key={name} sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.08)", border: "1px solid", borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.2)" }}>
                          <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.7rem" }}>{name}</Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
                {/* Daily: dropout students + reason */}
                {rType === "DAILY" && (() => {
                  const ids = entry.dropoutStudentIds as string[] | null;
                  const reasons = entry.dropoutReasons as Record<string, string> | null;
                  if (!ids?.length && !entry.dropouts) return null;
                  const dropoutStudents = (ids ?? []).map((id) => ({ id, name: studentMap.get(id) ?? id }));
                  const count = entry.dropouts ?? dropoutStudents.length;
                  return (
                    <Box sx={{ mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.04)", border: "1px solid", borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.15)" }}>
                      <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600, display: "block", mb: 0.75 }}>
                        {count} dropout{count !== 1 ? "s" : ""}
                      </Typography>
                      {dropoutStudents.length > 0 ? (
                        <Stack spacing={0.5}>
                          {dropoutStudents.map(({ id, name }) => (
                            <Box key={id} sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                              <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgb(var(--mui-palette-error-mainChannel) / 0.08)", border: "1px solid", borderColor: "rgb(var(--mui-palette-error-mainChannel) / 0.2)", flexShrink: 0 }}>
                                <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.7rem" }}>{name}</Typography>
                              </Box>
                              {reasons?.[id] && (
                                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                                  {reasons[id]}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      ) : null}
                    </Box>
                  );
                })()}
                {entry.guestsVisited && (
                  <Typography variant="caption" sx={{ color: "primary.main", display: "block", mt: 0.5 }}>
                    Guests:{" "}
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {entry.guestNotes ?? "Visited"}
                    </Box>
                  </Typography>
                )}
                {entry.blockers && (
                  <Typography variant="caption" sx={{ color: rType === "INCIDENT" ? "error.main" : "warning.main", display: "block", mt: 0.5 }}>
                    {rType === "INCIDENT" ? "Action taken: " : "Blocker: "}{entry.blockers}
                  </Typography>
                )}
                {(entry.mentorshipPairs !== null || entry.averageAge !== null) && (
                  <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                    {entry.mentorshipPairs !== null && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Mentorship pairs: {entry.mentorshipPairs}
                      </Typography>
                    )}
                    {entry.averageAge !== null && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Avg age: {entry.averageAge?.toFixed(1)}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Comments */}
                {entry.comments.length > 0 && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                    <Stack spacing={1}>
                      {entry.comments.map((c) => (
                        <Box key={c.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.1 }}>
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "primary.main", lineHeight: 1 }}>
                              {c.author.name.charAt(0).toUpperCase()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.72rem" }}>
                              {c.author.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                              {c.body}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Footer row: request-edit (instructor) or feedback panel (dept head) */}
                <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  {isOwnProfile && (
                    <RequestEditButton
                      entryId={entry.id}
                      userId={userId}
                      existingRequest={entry.editRequests[0] ?? null}
                    />
                  )}
                  {isDeptHead && sessionUser && (
                    <EntryFeedbackPanel
                      entryId={entry.id}
                      reviewerId={sessionUser.id}
                      reviewerRole={sessionUser.role}
                      initialComments={entry.comments as { id: string; body: string; createdAt: Date; author: { id: string; name: string; role: string } }[]}
                      editRequest={entry.editRequests[0] ?? null}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );

  const alertsContent = (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Active Alerts
        </Typography>
        {alerts.length > 0 && (
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              bgcolor: "error.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "error.contrastText" }}>
              {alerts.length}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ p: 2 }}>
        {alerts.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "success.main",
                boxShadow: "0 0 8px var(--mui-palette-success-main)",
                mx: "auto",
                mb: 1,
              }}
            />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No active alerts
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {alerts.map((alert) => {
              const meta = alert.metadata as Record<string, unknown> | null;
              const description = meta?.description as string | undefined;
              const severity = alert.severity as string;
              const chipColor = SEVERITY_COLOR[severity] ?? "default";

              return (
                <Box
                  key={alert.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderLeft: "3px solid",
                    borderLeftColor: severity === "CRITICAL" || severity === "HIGH" ? "error.main" : "warning.main",
                    borderRadius: 1.5,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Chip label={severity} size="small" color={chipColor} sx={{ fontSize: "0.6rem" }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ color: "text.primary", mb: 0.5 }}>
                    {alert.type.replace(/_/g, " ")}
                  </Typography>
                  {description && (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {description}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Top bar */}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" sx={{ color: "text.primary", letterSpacing: "-0.01em" }}>
                Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              </Typography>
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              {isDeptHead ? (
                <Typography
                  component={Link}
                  href={`/departments/${departmentId}`}
                  variant="body2"
                  sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}
                >
                  Design Department
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Design Department
                </Typography>
              )}
              <Box sx={{ width: 1, height: 20, bgcolor: "divider" }} />
              <Typography variant="body2" sx={{ color: "text.primary" }}>
                {instructor.name}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {sessionUser && <UserBar name={sessionUser.name} role={sessionUser.role} />}
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ color: "text.primary", mb: 0.5, letterSpacing: "-0.02em" }}>
              {instructor.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {instructor.email} · Design Department
            </Typography>
          </Box>
          {isOwnProfile && (
            <Button
              component={Link}
              href={`/submit?userId=${userId}&departmentId=${departmentId}`}
              variant="contained"
              startIcon={<EditNoteOutlinedIcon />}
              sx={{ flexShrink: 0 }}
            >
              Submit Daily Report
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Main content */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <InstructorTabs
              tabs={[
                { label: "Metrics", content: metricsTab },
                { label: "History", content: historyTab },
              ]}
            />
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {alertsContent}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
