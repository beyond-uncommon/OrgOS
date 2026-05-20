import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma } from "@orgos/db";

interface QueryParams {
  departmentIds?: string | string[];
  metric?: string;
  from?: string;
  to?: string;
  reportType?: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, departmentId } = sessionUser;
  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  if (role === "INSTRUCTOR" || accessibleIds.length === 0) {
    return NextResponse.json({ records: [], aggregates: null });
  }

  const { searchParams } = new URL(request.url);
  const params: QueryParams = {
    departmentIds: searchParams.getAll("departmentIds[]").length > 0
      ? searchParams.getAll("departmentIds[]")
      : searchParams.get("departmentIds")?.split(",").filter(Boolean) ?? [],
    metric: searchParams.get("metric") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    reportType: searchParams.get("reportType") || "",
  };

  const fromDate = params.from ? new Date(params.from) : null;
  const toDate = params.to ? new Date(params.to) : null;

  const whereDeptIds = (params.departmentIds as string[]).length > 0
    ? (params.departmentIds as string[]).filter((id) => accessibleIds.includes(id))
    : accessibleIds;

  const records = await prisma.extractedMetric.findMany({
    where: {
      entry: {
        departmentId: { in: whereDeptIds },
        ...(fromDate && toDate
          ? { date: { gte: fromDate, lte: toDate } }
          : fromDate
            ? { date: { gte: fromDate } }
            : toDate
              ? { date: { lte: toDate } }
              : {}),
        ...(params.reportType ? { reportType: params.reportType } : {}),
      },
      ...(params.metric ? { metricKey: params.metric } : {}),
    },
    include: {
      entry: {
        select: {
          id: true,
          date: true,
          quickSummary: true,
          reportType: true,
          departmentId: true,
          user: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const recordCount = records.length;
  const numericRecords = records.filter((r) => typeof r.metricValue === "number");

  let avg: number | null = null;
  let min: number | null = null;
  let max: number | null = null;

  if (numericRecords.length > 0) {
    const values = numericRecords.map((r) => r.metricValue as number);
    avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    min = Math.min(...values);
    max = Math.max(...values);
  }

  let trend: "up" | "down" | "flat" | null = null;
  if (records.length >= 4 && numericRecords.length >= 4) {
    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid).filter((r) => typeof r.metricValue === "number").map((r) => r.metricValue as number);
    const secondHalf = records.slice(mid).filter((r) => typeof r.metricValue === "number").map((r) => r.metricValue as number);
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      if (secondAvg > firstAvg * 1.05) trend = "up";
      else if (secondAvg < firstAvg * 0.95) trend = "down";
      else trend = "flat";
    }
  }

  return NextResponse.json({
    records,
    aggregates: recordCount > 0 ? { count: recordCount, avg, min, max, trend } : null,
  });
}