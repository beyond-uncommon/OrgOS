import Groq from "groq-sdk";
import { prisma, ReportStatus } from "@orgos/db";
import { toDateOnly, env } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { DailyReport } from "@orgos/shared-types";

const PROMPT_VERSION = "daily-summary-v1";

export async function generateDailyReport(
  departmentId: string,
  date: Date,
): Promise<ActionResult<DailyReport>> {
  const targetDate = toDateOnly(date);

  const existing = await prisma.dailyReport.findUnique({
    where: { departmentId_date: { departmentId, date: targetDate } },
  });
  if (existing) {
    return { success: false, error: "Daily report already exists for this date." };
  }

  const entries = await prisma.dailyEntry.findMany({
    where: { departmentId, date: targetDate },
    include: {
      user: { select: { name: true } },
      extractedMetrics: true,
    },
  });

  if (entries.length === 0) {
    return { success: false, error: "No daily entries found for this date." };
  }

  const systemPrompt = `You are a reporting system for an educational organization.
You have been given all daily entries for a department on a single day.
Your job is to draft a concise daily summary report.

## Output Format
Write a structured narrative report in plain text. Cover:
1. **Participation** — how many staff submitted, attendance context
2. **Highlights** — notable outputs, achievements, positive signals
3. **Blockers** — issues, concerns, dropouts mentioned
4. **Engagement Signals** — engagement trends from the day
5. **Flags** — any risk signals that need follow-up tomorrow

## Rules
- Be factual. Only state what the data supports.
- Do not invent metrics or trends.
- Flag any data quality issues.
- Keep it concise — a manager should be able to read this in 90 seconds.
- Do not include personally identifiable information beyond first names.`;

  const entriesData = entries.map((e) => ({
    user: e.user.name,
    attendanceStatus: e.attendanceStatus,
    outputCompleted: e.outputCompleted,
    blockers: e.blockers,
    engagementNotes: e.engagementNotes,
    quickSummary: e.quickSummary,
    metrics: e.extractedMetrics.map((m) => ({ key: m.metricKey, value: m.metricValue, confidence: m.confidence })),
  }));

  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate a daily report for department ${departmentId} on ${targetDate.toISOString()}.\n\nEntries:\n${JSON.stringify(entriesData, null, 2)}` },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  if (!content) {
    return { success: false, error: "LLM returned unexpected content type." };
  }

  const generated = { narrative: content };
  const aggregatedMetrics = aggregateMetrics(entries.flatMap((e) => e.extractedMetrics));

  const report = await prisma.dailyReport.create({
    data: {
      date: targetDate,
      departmentId,
      status: ReportStatus.DRAFT,
      generatedContent: generated,
      generatedMetrics: aggregatedMetrics as object,
      originalContent: generated,
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