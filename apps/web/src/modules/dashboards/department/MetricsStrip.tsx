import Grid from "@mui/material/Grid2";
import { MetricCard } from "@orgos/ui";
import type { ResolvedTrend } from "@orgos/shared-types";

interface Props {
  data: Record<string, unknown[]>;
}

function latestNumber(arr: unknown[]): number | null {
  const val = arr.at(-1);
  return typeof val === "number" ? val : null;
}

function attendanceTrend(arr: unknown[]): ResolvedTrend | undefined {
  if (arr.length < 2) return undefined;
  const prev = arr.at(-2) as number;
  const curr = arr.at(-1) as number;
  if (typeof prev !== "number" || typeof curr !== "number") return undefined;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.01) return { direction: "neutral", impact: "positive" };
  return delta > 0
    ? { direction: "up", impact: "positive" }
    : { direction: "down", impact: "negative" };
}

function engagementTrend(level: string | undefined): ResolvedTrend | undefined {
  if (!level) return undefined;
  const l = level.toLowerCase();
  if (l === "high") return { direction: "up", impact: "positive" };
  if (l === "low") return { direction: "down", impact: "negative" };
  return { direction: "neutral", impact: "positive" };
}

export function MetricsStrip({ data }: Props) {
  const attendance = latestNumber(data.attendance_rate ?? []);
  const outputs = latestNumber(data.output_count ?? []);
  const dropouts = latestNumber(data.dropout_count ?? []);
  const engagementRaw = (data.engagement_score ?? []).at(-1) as string | undefined;
  const engagementStr = engagementRaw
    ? engagementRaw.charAt(0) + engagementRaw.slice(1).toLowerCase()
    : "—";
  const trend = attendanceTrend(data.attendance_rate ?? []);
  const hasDropouts = dropouts !== null && dropouts > 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <MetricCard
          label="Attendance Rate"
          value={attendance !== null ? `${Math.round(attendance * 100)}` : "—"}
          unit="%"
          period="vs yesterday"
          {...(trend ? { trend } : {})}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <MetricCard
          label="Engagement"
          value={engagementStr}
          period="today"
          {...(engagementTrend(engagementRaw) ? { trend: engagementTrend(engagementRaw)! } : {})}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <MetricCard
          label="Outputs Completed"
          value={outputs ?? "—"}
          period="today"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
        <MetricCard
          label="Dropout Flags"
          value={dropouts ?? 0}
          {...(hasDropouts ? { trend: { direction: "up" as const, impact: "negative" as const } } : {})}
        />
      </Grid>
    </Grid>
  );
}
