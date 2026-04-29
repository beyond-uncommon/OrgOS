import { prisma, EntryStatus, MetricSource } from "@orgos/db";
import type { DailyEntry } from "@orgos/shared-types";
import type { ActionResult } from "@orgos/utils";
import { logError } from "@orgos/utils";
import { structuredExtraction } from "./structuredExtraction.js";
import { narrativeExtraction } from "./narrativeExtraction.js";
import { runAnomalyDetection } from "@orgos/anomaly-detection";

export async function extractMetrics(
  entry: DailyEntry
): Promise<ActionResult<void>> {
  await prisma.dailyEntry.update({
    where: { id: entry.id },
    data: { status: EntryStatus.PROCESSING },
  });

  try {
    // 1. Deterministic extraction from structured fields
    const structured = structuredExtraction(entry);

    // 2. LLM extraction from narrative text — falls back to empty on failure
    const narrativeText = [
      entry.outputCompleted,
      entry.blockers,
      entry.engagementNotes,
      entry.quickSummary,
    ]
      .filter(Boolean)
      .join("\n");

    const { metrics: narrative, confidence, promptVersion } =
      await narrativeExtraction(narrativeText).catch((err) => {
        logError("metric_extraction.narrative_error", err, { entryId: entry.id });
        return { metrics: {}, confidence: 0, promptVersion: "extraction-v1" };
      });

    // 3. Merge — structured takes precedence over inferred
    const merged = { ...narrative, ...structured };

    // 4. Persist each metric
    const records = Object.entries(merged).map(([metricKey, metricValue]) => ({
      entryId: entry.id,
      metricKey,
      metricValue: metricValue as unknown as object,
      confidence: metricKey in structured ? 1.0 : confidence,
      source: metricKey in structured ? MetricSource.STRUCTURED : MetricSource.NARRATIVE,
      flagged: confidence < 0.6,
      promptVersion,
    }));

    if (records.length > 0) {
      await prisma.extractedMetric.createMany({ data: records });
    }

    await prisma.dailyEntry.update({
      where: { id: entry.id },
      data: { status: EntryStatus.COMPLETE },
    });

    // Detection runs after COMPLETE — must never block or fail extraction
    runAnomalyDetection(entry.id).catch((err) => {
      logError("metric_extraction.anomaly_detection_error", err, { entryId: entry.id });
    });

    return { success: true, data: undefined };
  } catch (err) {
    // Reset status so the entry is not permanently stuck at PROCESSING
    await prisma.dailyEntry.update({
      where: { id: entry.id },
      data: { status: EntryStatus.SUBMITTED },
    }).catch(() => undefined);

    logError("metric_extraction.fatal_error", err, { entryId: entry.id });
    return { success: false, error: String(err) };
  }
}
