import Groq from "groq-sdk";
import { prisma, ReportStatus } from "@orgos/db";
import { env } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { MonthlyReport } from "@orgos/shared-types";
import { readFileSync } from "fs";
import { join } from "path";

const PROMPT_VERSION = "monthly-summary-v1";

export async function generateMonthlyReport(
  departmentId: string,
  year: number,
  month: number
): Promise<ActionResult<MonthlyReport>> {
  const existing = await prisma.monthlyReport.findUnique({
    where: { departmentId_periodYear_periodMonth: { departmentId, periodYear: year, periodMonth: month } },
  });
  if (existing) {
    return { success: false, error: "Monthly report already exists for this period." };
  }

  // Require all weekly reports for the month to be approved first
  const weeklyReports = await prisma.weeklyReport.findMany({
    where: {
      departmentId,
      weekStart: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  const unapproved = weeklyReports.filter((r) => r.status !== ReportStatus.APPROVED);
  if (unapproved.length > 0) {
    return {
      success: false,
      error: `${unapproved.length} weekly report(s) must be approved before generating the monthly report.`,
    };
  }

  const systemPrompt = readFileSync(
    join(process.cwd(), "docs/prompts/monthly-summary-v1.md"),
    "utf-8"
  );

  const client = new Groq({ apiKey: env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a monthly report for department ${departmentId} for ${year}-${String(month).padStart(2, "0")}.\n\nWeekly reports:\n${JSON.stringify(weeklyReports, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  if (!content) {
    return { success: false, error: "LLM returned unexpected content type." };
  }

  const generated = { narrative: content };

  const report = await prisma.monthlyReport.create({
    data: {
      periodMonth: month,
      periodYear: year,
      departmentId,
      status: ReportStatus.DRAFT,
      generatedContent: generated,
      generatedMetrics: {},
      originalContent: generated,
      editLog: [],
      promptVersion: PROMPT_VERSION,
    },
  });

  return { success: true, data: report };
}
