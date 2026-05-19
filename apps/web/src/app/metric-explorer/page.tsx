"use client";

import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Chip,
  TextField,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { LineChart, BarChart } from "@mui/x-charts";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
}

interface MetricRecord {
  id: string;
  metricKey: string;
  metricValue: unknown;
  confidence: number;
  source: string;
  flagged: boolean;
  createdAt: string;
  entry: {
    id: string;
    date: string;
    quickSummary: string;
    reportType: string;
    departmentId: string;
    user: { id: string; name: string };
    department: { id: string; name: string };
  };
}

interface Aggregates {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  trend: "up" | "down" | "flat" | null;
}

interface ApiResponse {
  records: MetricRecord[];
  aggregates: Aggregates | null;
}

const METRICS = [
  { value: "attendance_rate", label: "Attendance Rate" },
  { value: "dropout_count", label: "Dropout Count" },
  { value: "engagement_score", label: "Engagement Score" },
  { value: "output_count", label: "Output Count" },
  { value: "blocker_present", label: "Blocker Present" },
];

const REPORT_TYPES = [
  { value: "", label: "All Types" },
  { value: "DAILY", label: "Daily" },
  { value: "INCIDENT", label: "Incident" },
  { value: "SESSION", label: "Session" },
];

function getCellColor(metric: string, value: unknown): string {
  if (typeof value !== "number") return "transparent";
  switch (metric) {
    case "attendance_rate":
      return value >= 85 ? "#2e7d32" : value >= 70 ? "#f57c00" : "#c62828";
    case "dropout_count":
      return value === 0 ? "#2e7d32" : value <= 2 ? "#f57c00" : "#c62828";
    case "engagement_score":
      if (typeof value !== "number") return "#f57c00";
      return value >= 2 ? "#2e7d32" : value >= 1 ? "#f57c00" : "#c62828";
    case "blocker_present":
      if (typeof value === "boolean") return value === false ? "#2e7d32" : "#c62828";
      return value === 0 ? "#2e7d32" : "#c62828";
    default:
      return "#1976d2";
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value % 1 === 0 ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function alpha(color: string, opacity: number): string {
  const c = color.startsWith("#") ? color.slice(1) : "";
  if (c.length !== 6) return `rgba(0,0,0,${opacity})`;
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function SummaryCard({ label, value, color, trend }: { label: string; value: string; color?: string; trend?: string }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper", textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? "text.primary", mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>{label}</Typography>
      {trend && (
        <Typography variant="caption" sx={{
          color: trend === "up" ? "success.main" : trend === "down" ? "error.main" : "text.secondary",
          fontWeight: 600,
        }}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trend !== "flat" ? "vs prior period" : "stable"}
        </Typography>
      )}
    </Box>
  );
}

export default function MetricExplorerPage() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [selectedDepts, setSelectedDepts] = React.useState<Department[]>([]);
  const [selectedMetric, setSelectedMetric] = React.useState<string>("attendance_rate");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [reportType, setReportType] = React.useState<string>("");
  const [view, setView] = React.useState<"table" | "chart">("table");
  const [loading, setLoading] = React.useState(false);
  const [records, setRecords] = React.useState<MetricRecord[]>([]);
  const [aggregates, setAggregates] = React.useState<Aggregates | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data: Department[]) => setDepartments(data))
      .catch(() => {});
  }, []);

  async function applyFilters() {
    setLoading(true);
    setHasLoaded(true);
    try {
      const params = new URLSearchParams();
      selectedDepts.forEach((d) => params.append("departmentIds[]", d.id));
      if (selectedMetric) params.set("metric", selectedMetric);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (reportType) params.set("reportType", reportType);
      const res = await fetch(`/api/metric-explorer?${params.toString()}`);
      const data: ApiResponse = await res.json();
      setRecords(data.records);
      setAggregates(data.aggregates);
    } catch {
      setRecords([]);
      setAggregates(null);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSelectedDepts([]);
    setSelectedMetric("attendance_rate");
    setFromDate("");
    setToDate("");
    setReportType("");
    setRecords([]);
    setAggregates(null);
    setHasLoaded(false);
  }

  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const uniqueDates = [...new Set(records.map((r) => r.entry.date.slice(0, 10)))].sort();
  const uniqueDeptIds = [...new Set(records.map((r) => r.entry.departmentId))];

  const pivotData = uniqueDeptIds.map((deptId) => {
    const dept = deptMap.get(deptId);
    const row: { deptId: string; deptName: string; values: Record<string, string> } = {
      deptId,
      deptName: dept?.name ?? deptId,
      values: {},
    };
    uniqueDates.forEach((date) => {
      const rec = records.find(
        (r) => r.entry.departmentId === deptId && r.entry.date.slice(0, 10) === date
      );
      row.values[date] = rec ? formatCellValue(rec.metricValue) : "—";
    });
    return row;
  });

  const chartSeries = pivotData.map((row) => ({
    label: row.deptName,
    data: uniqueDates.map((date) => {
      const v = row.values[date];
      return v === "—" ? null : Number(v) ?? null;
    }),
  }));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6">
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, letterSpacing: "-0.02em" }}>Metric Explorer</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Explore extracted metrics across departments, time periods, and report types.
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
            <Autocomplete
              multiple
              size="small"
              options={departments}
              getOptionLabel={(o) => o.name}
              value={selectedDepts}
              onChange={(_, v) => setSelectedDepts(v)}
              sx={{ minWidth: 280, flex: 1 }}
              renderInput={(params) => <TextField {...params as any} label="Departments" placeholder="All departments" size="small" />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.name}
                    size="small"
                    variant="outlined"
                  />
                ))
              }
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {METRICS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((rt) => (
                  <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={applyFilters} startIcon={<SearchIcon />}>
                Apply Filters
              </Button>
              <Button variant="outlined" onClick={resetFilters} startIcon={<RefreshIcon />}>
                Reset
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {hasLoaded && !loading && aggregates && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard label="Records" value={String(aggregates.count)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard
                label="Average"
                value={aggregates.avg !== null ? (aggregates.avg % 1 === 0 ? String(aggregates.avg) : aggregates.avg.toFixed(2)) : "—"}
                color={aggregates.avg !== null ? "primary.main" : "text.secondary"}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard
                label="Min / Max"
                value={
                  aggregates.min !== null && aggregates.max !== null
                    ? `${aggregates.min} / ${aggregates.max}`
                    : "—"
                }
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <SummaryCard
                label="Trend"
                value={aggregates.trend ? aggregates.trend.charAt(0).toUpperCase() + aggregates.trend.slice(1) : "—"}
                color={
                  aggregates.trend === "up"
                    ? "success.main"
                    : aggregates.trend === "down"
                      ? "error.main"
                      : "text.secondary"
                }
                trend={aggregates.trend ? "up" : "flat"}
              />
            </Grid>
          </Grid>
        )}

        {hasLoaded && !loading && (
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, v) => v && setView(v)}
              size="small"
            >
              <ToggleButton value="table">Table</ToggleButton>
              <ToggleButton value="chart">Chart</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {hasLoaded && !loading && view === "table" && (
          <Paper sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            {records.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body1" sx={{ color: "text.secondary" }}>No records found for the selected filters.</Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Department</TableCell>
                    {uniqueDates.map((d) => (
                      <TableCell key={d} sx={{ fontWeight: 600, fontSize: "0.75rem", textAlign: "center", minWidth: 80 }}>
                        {d}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pivotData.map((row) => (
                    <TableRow key={row.deptId} hover>
                      <TableCell sx={{ fontWeight: 500, fontSize: "0.8rem" }}>{row.deptName}</TableCell>
                      {uniqueDates.map((date) => {
                        const raw = records.find(
                          (r) => r.entry.departmentId === row.deptId && r.entry.date.slice(0, 10) === date
                        );
                        const value = raw?.metricValue;
                        const cellColor = getCellColor(selectedMetric, value ?? null);
                        const displayVal = row.values[date];
                        return (
                          <TableCell
                            key={date}
                            sx={{
                              textAlign: "center",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                              bgcolor: raw ? alpha(cellColor, 0.12) : "transparent",
                              color: raw ? cellColor : "text.disabled",
                              fontWeight: raw ? 600 : 400,
                            }}
                          >
                            {displayVal}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {hasLoaded && !loading && view === "chart" && (
          <Paper sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            {records.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body1" sx={{ color: "text.secondary" }}>No data to display in chart view.</Typography>
              </Box>
            ) : (
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
                    {METRICS.find((m) => m.value === selectedMetric)?.label ?? selectedMetric} Over Time
                  </Typography>
                  <LineChart
                    xAxis={[{ data: uniqueDates, scaleType: "band", tickLabelStyle: { fontSize: 10 } }]}
                    series={chartSeries}
                    height={280}
                    margin={{ top: 10, bottom: 40, left: 50, right: 20 }}
                    yAxis={[{ tickLabelStyle: { fontSize: 10 } }]}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
                    Department Comparison
                  </Typography>
                  <BarChart
                    xAxis={[{ data: pivotData.map((r) => r.deptName), scaleType: "band", tickLabelStyle: { fontSize: 10 } }]}
                    series={chartSeries.map((s) => ({ ...s, data: s.data.map((v) => v ?? 0) }))}
                    height={280}
                    margin={{ top: 10, bottom: 40, left: 50, right: 20 }}
                    yAxis={[{ tickLabelStyle: { fontSize: 10 } }]}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>
        )}

        {!hasLoaded && (
          <Paper sx={{ textAlign: "center", py: 10, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <SearchIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: "text.secondary" }}>Select filters and apply to explore metrics</Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
              Choose departments, a metric, and a date range to get started.
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}