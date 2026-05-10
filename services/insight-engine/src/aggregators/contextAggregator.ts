import { prisma } from "@orgos/db";
import type { InsightContext, AnomalyResult, AnomalyType, MetricKey } from "@orgos/shared-types";

/**
 * Fetches and assembles all structured data for a department + time window.
 * This is the only place in the insight engine that touches the database.
 */
export async function buildInsightContext(
  departmentId: string,
  from: Date,
  to: Date
): Promise<InsightContext> {
  const [alerts, entries] = await Promise.all([
    prisma.alert.findMany({
      where: { entry: { departmentId, date: { gte: from, lte: to } } },
      select: { id: true, type: true, severity: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailyEntry.findMany({
      where: { departmentId, date: { gte: from, lte: to } },
      include: { extractedMetrics: true },
    }),
  ]);

  // Reconstruct AnomalyResult[] from alert metadata — avoids a separate anomaly store
  const anomalies: AnomalyResult[] = alerts
    .filter((a) => a.metadata != null)
    .map((a) => {
      const meta = a.metadata as Record<string, unknown>;
      const anomalyType = (meta.anomalyType ?? "SPIKE") as AnomalyType;
      const metricKey = meta.metricKey as MetricKey | undefined;
      const entryId = meta.entryId as string | undefined;
      const userId = meta.userId as string | undefined;
      const detectionWindow = meta.detectionWindow as string | undefined;
      const consecutiveDays = meta.consecutiveDays as number | undefined;
      const description = (meta.description as string) ?? "";
      const detectedAt = new Date(meta.detectedAt as string);
      return {
        anomalyType,
        ...(metricKey !== undefined ? { metricKey } : {}),
        ...(entryId !== undefined ? { entryId } : {}),
        ...(userId !== undefined ? { userId } : {}),
        departmentId,
        description,
        detectedAt,
        ...(detectionWindow !== undefined ? { detectionWindow } : {}),
        ...(consecutiveDays !== undefined ? { consecutiveDays } : {}),
      };
    });

  const metrics = entries.flatMap((e) =>
    e.extractedMetrics.map((m) => ({
      metricKey: m.metricKey,
      metricValue: m.metricValue,
      extractedAt: m.createdAt,
      userId: e.userId,
    }))
  );

  return {
    departmentId,
    timeWindow: { from, to },
    anomalies,
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      createdAt: a.createdAt,
    })),
    metrics,
  };
}
