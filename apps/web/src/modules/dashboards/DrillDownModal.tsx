"use client";
import * as React from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import type { Severity } from "@orgos/db";

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  metric: string;
  hubName: string;
}

interface EntryRecord {
  id: string;
  metricValue: unknown;
  confidence: number;
  createdAt: string;
  entry: {
    id: string;
    date: string;
    quickSummary: string;
    user: { id: string; name: string };
    department: { id: string; name: string };
  };
}

interface Aggregates {
  count: number;
  avg: number | null;
}

const STOP_WORDS = new Set([
  "the", "and", "a", "an", "is", "was", "are", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "to", "of", "in", "for", "on", "with",
  "at", "by", "from", "as", "into", "through", "during", "before", "after",
  "above", "below", "between", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "s", "t", "just", "don", "now", "i", "me", "my",
  "we", "our", "you", "your", "he", "she", "it", "they", "them", "their",
  "this", "that", "these", "those", "but", "if", "or", "because", "until",
  "while", "about", "against", "over", "today", "yesterday", "day", "week",
]);

function extractPhrases(texts: string[]): { phrase: string; count: number }[] {
  const wordCounts: Record<string, number> = {};
  const phraseCounts: Record<string, number> = {};

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      wordCounts[word] = (wordCounts[word] ?? 0) + 1;
    }

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phraseCounts[phrase] = (phraseCounts[phrase] ?? 0) + 1;
    }
  }

  const combined: Record<string, number> = { ...wordCounts };
  for (const [phrase, count] of Object.entries(phraseCounts)) {
    if (count >= 2) {
      combined[phrase] = (combined[phrase] ?? 0) + count * 0.8;
    }
  }

  return Object.entries(combined)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function formatMetricValue(metric: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (metric === "attendance_rate") return `${Math.round(value * 100)}%`;
    return metric === "engagement_score" ? String(value).toUpperCase() : String(value);
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function calculateContribution(
  metric: string,
  value: unknown,
  avg: number | null,
  count: number
): number {
  if (count === 0 || avg === null) return 0;
  if (typeof value !== "number") return 0;

  switch (metric) {
    case "attendance_rate":
      return Math.round(((avg - value) / avg) * 100);
    case "dropout_count":
      return Math.round((value / (avg || 1)) * 100);
    case "output_count":
      return Math.round((value / (avg || 1)) * 100);
    default:
      return 0;
  }
}

export function DrillDownModal({
  open,
  onClose,
  departmentId,
  metric,
  hubName,
}: DrillDownModalProps) {
  const [loading, setLoading] = React.useState(true);
  const [records, setRecords] = React.useState<EntryRecord[]>([]);
  const [aggregates, setAggregates] = React.useState<Aggregates | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const metricLabel = React.useMemo(() => {
    const labels: Record<string, string> = {
      attendance_rate: "Attendance Rate",
      dropout_count: "Dropout Count",
      engagement_score: "Engagement Score",
      output_count: "Output Count",
      blocker_present: "Blocker Present",
    };
    return labels[metric] ?? metric;
  }, [metric]);

  React.useEffect(() => {
    if (!open || !departmentId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("departmentIds[]", departmentId);
        params.append("metric", metric);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
        params.append("from", fromDate.toISOString().split("T")[0] ?? "");

        const res = await fetch(`/api/metric-explorer?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const data = await res.json();
        setRecords(data.records ?? []);
        setAggregates(data.aggregates ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setRecords([]);
        setAggregates(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, departmentId, metric]);

  const sortedRecords = React.useMemo(() => {
    if (!aggregates?.avg) return records;
    return [...records].sort((a, b) => {
      const contribA = calculateContribution(
        metric,
        a.metricValue,
        aggregates.avg,
        records.length
      );
      const contribB = calculateContribution(
        metric,
        b.metricValue,
        aggregates.avg,
        records.length
      );
      return Math.abs(contribB) - Math.abs(contribA);
    });
  }, [records, aggregates, metric]);

  const topPhrases = React.useMemo(() => {
    const summaries = records.map((r) => r.entry.quickSummary).filter(Boolean);
    return extractPhrases(summaries);
  }, [records]);

  const contributionScores = React.useMemo(() => {
    if (!aggregates?.avg || records.length === 0) return new Map<string, number>();
    const scores = new Map<string, number>();
    for (const record of records) {
      const score = calculateContribution(
        metric,
        record.metricValue,
        aggregates.avg,
        records.length
      );
      scores.set(record.id, Math.abs(score));
    }
    return scores;
  }, [records, aggregates, metric]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Why is this happening?
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {hubName} • {metricLabel}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          size="small"
          sx={{
            minWidth: "auto",
            p: 1,
            borderRadius: 1,
          }}
        >
          ✕
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <Typography>Loading...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {!loading && !error && (
          <>
            <Box
              sx={{
                px: 3,
                py: 2,
                bgcolor: "grey.50",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {sortedRecords.length} entries analyzed
              </Typography>
              {topPhrases.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", mr: 1 }}>
                    Top contributing factors:
                  </Typography>
                  {topPhrases.map((p) => (
                    <Box
                      key={p.phrase}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1.5,
                        py: 0.5,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {p.phrase}
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          px: 0.75,
                          py: 0.25,
                          bgcolor: "primary.light",
                          color: "primary.contrastText",
                          borderRadius: 0.5,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                        }}
                      >
                        {p.count}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ px: 3, py: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Instructor</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Summary</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", textAlign: "right" }}>
                      Value
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", textAlign: "right" }}>
                      Contribution
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRecords.slice(0, 20).map((record) => {
                    const contribution = contributionScores.get(record.id) ?? 0;
                    return (
                      <TableRow key={record.id} hover>
                        <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {new Date(record.entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                          {record.entry.user.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", maxWidth: 300 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {record.entry.quickSummary.slice(0, 80)}
                            {record.entry.quickSummary.length > 80 ? "..." : ""}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: "0.8rem",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        >
                          {formatMetricValue(metric, record.metricValue)}
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              bgcolor:
                                contribution > 30
                                  ? "error.light"
                                  : contribution > 15
                                    ? "warning.light"
                                    : "grey.100",
                              borderRadius: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color:
                                  contribution > 30
                                    ? "error.dark"
                                    : contribution > 15
                                      ? "warning.dark"
                                      : "text.secondary",
                              }}
                            >
                              {contribution}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {sortedRecords.length > 20 && (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", textAlign: "center", py: 2 }}
                >
                  Showing top 20 of {sortedRecords.length} entries
                </Typography>
              )}
            </Box>

            {aggregates && (
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  bgcolor: "grey.50",
                  borderTop: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  gap: 4,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Total Entries
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {aggregates.count}
                  </Typography>
                </Box>
                {aggregates.avg !== null && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Period Average
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatMetricValue(metric, aggregates.avg)}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Time Window
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Last 30 days
                  </Typography>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}