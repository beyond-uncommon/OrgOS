import Groq from "groq-sdk";
import { prisma, ReportStatus } from "@orgos/db";
import { getWeekBounds, env } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { WeeklyReport } from "@orgos/shared-types";
import { readFileSync } from "fs";
import { join } from "path";

const PROMPT_VERSION = "weekly-summary-v1";

export async function generateWeeklyReport(
  departmentId: string,
  weekOf: Date
): Promise<ActionResult<WeeklyReport>> {
  const { weekStart, weekEnd } = getWeekBounds(weekOf);

  const existing = await prisma.weeklyReport.findUnique({
    where: { departmentId_weekStart: { departmentId, weekStart } },
  });
  if (existing) {
    return { success: false, error: "Weekly report already exists for this period." };
  }

  // Gather all extracted metrics for the department over the week
  const metrics = await prisma.extractedMetric.findMany({
    where: {
      entry: { departmentId, date: { gte: weekStart, lte: weekEnd } },
    },
    include: { entry: true },
  });

  const systemPrompt = readFileSync(
    join(process.cwd(), "docs/prompts/weekly-summary-v1.md"),
    "utf-8"
  );

  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a weekly report for department ${departmentId} for the week of ${weekStart.toISOString()}.\n\nMetrics data:\n${JSON.stringify(metrics, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  if (!content) {
    return { success: false, error: "LLM returned unexpected content type." };
  }

  const generated = { narrative: content };
  const aggregatedMetrics = aggregateMetrics(metrics);

  const report = await prisma.weeklyReport.create({
    data: {
      weekStart,
      weekEnd,
      departmentId,
      status: ReportStatus.DRAFT,
      generatedContent: generated,
      generatedMetrics: aggregatedMetrics as object,
      risks: {},
      originalContent: generated, // preserved forever
      editLog: [],
      promptVersion: PROMPT_VERSION,
    },
  });

  return { success: true, data: report };
}

function aggregateMetrics(metrics: { metricKey: string; metricValue: unknown }[]) {
  const grouped: Record<string, unknown[]> = {};
  for (const m of metrics) {
    if (!grouped[m.metricKey]) grouped[m.metricKey] = [];
    grouped[m.metricKey]!.push(m.metricValue);
  }
  return grouped;
}
