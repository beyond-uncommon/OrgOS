import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma, SnapshotScope } from "@orgos/db";

const querySchema = z.object({
  metric: z
    .enum(["attendance_rate", "dropout_count", "engagement_score", "output_count", "blocker_present", "risk_flag"])
    .optional()
    .default("attendance_rate"),
  period: z.enum(["7d", "30d", "90d"]).optional().default("7d"),
});

const periodDays: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function getDateCutoff(period: string): Date {
  const days = periodDays[period] ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

const VALID_METRICS = [
  "attendance_rate",
  "dropout_count",
  "engagement_score",
  "output_count",
  "blocker_present",
  "risk_flag",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = params;
  const validTypes = ["trends", "comparison", "breakdown", "heatmap"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid chart type" }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    metric: sp.get("metric") ?? undefined,
    period: sp.get("period") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const { metric, period } = parsed.data;
  const accessibleIds = await getAccessibleDepartmentIds(user.role, user.departmentId, prisma);

  const hubs = await prisma.department.findMany({
    where: accessibleIds.length > 0 ? { id: { in: accessibleIds } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const cutoff = getDateCutoff(period);

  const snapshots = await prisma.dashboardSnapshot.findMany({
    where: {
      scope: "HUB" as SnapshotScope,
      departmentId: { in: hubs.map((h) => h.id) },
      periodStart: { gte: cutoff },
    },
    orderBy: { periodStart: "asc" },
  });

  const hubIdToName = Object.fromEntries(hubs.map((h) => [h.id, h.name]));

  if (type === "trends") {
    const byDate: Record<string, number> = {};
    for (const snap of snapshots) {
      const d = snap.data as Record<string, unknown[]> | null;
      const vals = d?.[metric];
      if (!vals || !vals.length) continue;
      const last = vals[vals.length - 1];
      if (typeof last !== "number") continue;
      const dateKey = snap.periodStart.toISOString().split("T")[0] ?? "";
      if (!byDate[dateKey]) {
        byDate[dateKey] = 0;
        let count = 0;
        for (const s of snapshots) {
          const sd = s.data as Record<string, unknown[]> | null;
          const v = sd?.[metric];
          if (v?.length) {
            const lv = v[v.length - 1];
            if (typeof lv === "number") {
              byDate[dateKey] += lv;
              count += 1;
            }
          }
        }
        if (count > 0) byDate[dateKey] /= count;
      }
    }
    const chartData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
    return NextResponse.json({ data: chartData, metric });
  }

  if (type === "comparison") {
    const latestSnapshots: Record<string, { periodStart: Date; data: Record<string, unknown[]> }> = {};
    for (const snap of snapshots) {
      const snapId = snap.departmentId ?? "";
      const existing = latestSnapshots[snapId];
      if (!existing || snap.periodStart > existing.periodStart) {
        latestSnapshots[snapId] = { periodStart: snap.periodStart, data: snap.data as Record<string, unknown[]> };
      }
    }
    const data = hubs.map((hub) => {
      const snap = latestSnapshots[hub.id];
      const vals = snap?.data[metric] as number[] | undefined;
      const avg = vals?.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { id: hub.id, name: hub.name, value: Math.round(avg * 100) / 100 };
    });
    return NextResponse.json({ data, metric });
  }

  if (type === "breakdown") {
    const distribution: Record<string, number> = {};
    for (const snap of snapshots) {
      const d = snap.data as Record<string, unknown[]> | null;
      if (!d) continue;
      for (const vals of Object.values(d)) {
        if (!Array.isArray(vals)) continue;
        for (const v of vals) {
          if (metric === "engagement_score") {
            const key = String(v);
            distribution[key] = (distribution[key] ?? 0) + 1;
          } else if (typeof v === "number") {
            const bucket = v === 0 ? "Zero" : v <= 2 ? "Low" : v <= 5 ? "Mid" : "High";
            distribution[bucket] = (distribution[bucket] ?? 0) + 1;
          }
        }
      }
    }
    const colorMap: Record<string, string> = {
      HIGH: "#2E7D32",
      MEDIUM: "#F9A825",
      LOW: "#C62828",
      Zero: "#2E7D32",
      Low: "#F9A825",
      Mid: "#F57C00",
      High: "#C62828",
    };
    const segments = Object.entries(distribution).map(([label, value]) => ({
      label,
      value,
      color: colorMap[label] ?? "#9E9E9E",
    }));
    return NextResponse.json({ segments, title: `${metric} Distribution` });
  }

  if (type === "heatmap") {
    const hubIds = hubs.map((h) => h.id);
    const hubNames = hubs.map((h) => h.name);
    const metricKeys = [...VALID_METRICS];

    const latestPerHub: Record<string, Record<string, number>> = {};
    for (const snap of snapshots) {
      const snapId = snap.departmentId ?? "";
      if (!latestPerHub[snapId]) latestPerHub[snapId] = {};
      const d = snap.data as Record<string, unknown[]> | null;
      if (!d) continue;
      for (const mk of metricKeys) {
        const vals = d[mk] as number[] | undefined;
        if (vals?.length) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          latestPerHub[snapId][mk] = avg;
        }
      }
    }

    const cells = hubIds.flatMap((hubId) =>
      metricKeys.map((mk) => ({
        hubId,
        hubName: hubIdToName[hubId] ?? hubId,
        metricKey: mk,
        value: latestPerHub[hubId ?? ""]?.[mk] ?? null,
      }))
    );

    return NextResponse.json({ cells, hubIds, hubNames, metricKeys });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}