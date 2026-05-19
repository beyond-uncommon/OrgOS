import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { verifyCronRequest } from "@/lib/cron/auth";
import { prisma, Role, Severity, InterventionStatus } from "@orgos/db";
import { withRetry, logError } from "@orgos/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface HubData {
  hubId: string;
  hubName: string;
  parentId: string;
  instructors: Array<{
    id: string;
    name: string;
    submissionCount: number;
  }>;
  dailyEntries: Array<{
    id: string;
    date: string;
    userName: string;
    quickSummary: string;
    attendanceStatus: string;
    outputCompleted: string;
    engagementScore: string | null;
    dropouts: number | null;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    createdAt: string;
    resolved: boolean;
  }>;
  interventions: Array<{
    id: string;
    issueType: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}

async function fetchHubData(hubId: string, weekStart: Date, weekEnd: Date): Promise<HubData> {
  const hub = await prisma.department.findUnique({
    where: { id: hubId },
    select: { id: true, name: true, parentDepartmentId: true },
  });

  if (!hub) throw new Error(`Hub not found: ${hubId}`);

  const instructors = await prisma.user.findMany({
    where: { departmentId: hubId, role: Role.INSTRUCTOR },
    select: { id: true, name: true },
  });

  const instructorIds = instructors.map((i) => i.id);

  const submissionCounts = await prisma.dailyEntry.groupBy({
    by: ["userId"],
    where: {
      userId: { in: instructorIds },
      date: { gte: weekStart, lte: weekEnd },
    },
    _count: true,
  });

  const instructorSubmissionMap = new Map(submissionCounts.map((s) => [s.userId, s._count]));
  const instructorsWithCount = instructors.map((i) => ({
    id: i.id,
    name: i.name,
    submissionCount: instructorSubmissionMap.get(i.id) ?? 0,
  }));

  const entries = await prisma.dailyEntry.findMany({
    where: {
      departmentId: hubId,
      date: { gte: weekStart, lte: weekEnd },
    },
    select: {
      id: true,
      date: true,
      userId: true,
      quickSummary: true,
      attendanceStatus: true,
      outputCompleted: true,
      engagementScore: true,
      dropouts: true,
    },
    orderBy: { date: "asc" },
  });

  const userIds = [...new Set(entries.map((e) => e.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const dailyEntries = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().split("T")[0] ?? e.date.toISOString().slice(0, 10),
    userName: userMap.get(e.userId) ?? "Unknown",
    quickSummary: e.quickSummary,
    attendanceStatus: e.attendanceStatus,
    outputCompleted: e.outputCompleted,
    engagementScore: e.engagementScore,
    dropouts: e.dropouts,
  }));

  const alerts = await prisma.alert.findMany({
    where: {
      entry: { departmentId: hubId },
      createdAt: { gte: weekStart, lte: weekEnd },
    },
    select: {
      id: true,
      type: true,
      severity: true,
      createdAt: true,
      resolved: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const alertsData = alerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    createdAt: a.createdAt.toISOString(),
    resolved: a.resolved,
  }));

  const interventionAlerts = await prisma.alert.findMany({
    where: {
      entry: { departmentId: hubId },
      createdAt: { gte: weekStart, lte: weekEnd },
      interventions: { some: {} },
    },
    select: { id: true },
  });
  const alertIds = interventionAlerts.map((a) => a.id);

  const interventions = await prisma.intervention.findMany({
    where: { alertId: { in: alertIds } },
    select: {
      id: true,
      issueType: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const interventionsData = interventions.map((i) => ({
    id: i.id,
    issueType: i.issueType,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
    resolvedAt: i.resolvedAt?.toISOString() ?? null,
  }));

  return {
    hubId: hub.id,
    hubName: hub.name,
    parentId: hub.parentDepartmentId ?? "",
    instructors: instructorsWithCount,
    dailyEntries,
    alerts: alertsData,
    interventions: interventionsData,
  };
}

function buildPrompt(data: HubData): string {
  const totalSubmissions = data.instructors.reduce((sum, i) => sum + i.submissionCount, 0);
  const totalInstructors = data.instructors.length;
  const submissionRate = totalInstructors > 0 ? Math.round((totalSubmissions / (totalInstructors * 7)) * 100) : 0;

  const entriesText = data.dailyEntries
    .map((e) => `- ${e.date}: ${e.userName} — ${e.quickSummary || "(no summary)"}`)
    .join("\n");

  const alertsText = data.alerts
    .map((a) => `- ${a.type} (${a.severity})${a.resolved ? " [RESOLVED]" : ""}`)
    .join("\n");

  const interventionsText = data.interventions
    .map((i) => `- ${i.issueType} (${i.status})${i.resolvedAt ? " [RESOLVED]" : ""}`)
    .join("\n");

  const instructorList = data.instructors
    .map((i) => `- ${i.name}: ${i.submissionCount}/7 submissions`)
    .join("\n");

  const metrics = data.dailyEntries.reduce(
    (acc, e) => {
      if (e.engagementScore) acc.engagement[e.engagementScore] = (acc.engagement[e.engagementScore] ?? 0) + 1;
      acc.dropouts += e.dropouts ?? 0;
      return acc;
    },
    { engagement: {} as Record<string, number>, dropouts: 0 }
  );

  return `You are an organizational operations assistant. Generate a concise weekly brief for the hub lead.

## Hub: ${data.hubName}

### Submission Overview
${instructorList}
Total submissions: ${totalSubmissions}/${totalInstructors * 7} (${submissionRate}% rate)

### Daily Entries
${entriesText || "No entries this week."}

### Alerts This Week
${alertsText || "No alerts this week."}

### Interventions
${interventionsText || "No interventions this week."}

### Metrics Summary
Total dropouts reported: ${metrics.dropouts}
Engagement breakdown: ${JSON.stringify(metrics.engagement)}

Generate a 300-500 word weekly brief in markdown format with these sections:
- **Highlights**: Key wins, participation rates, notable achievements
- **Risks This Week**: Any alerts, dropouts, issues flagged
- **Actions Taken**: Interventions created and resolved
- **Recommended Actions**: Specific, actionable next steps for the hub lead

Keep it concise, data-driven, and actionable. Use bullet points. Do not include any preamble or explanation.`;
}

async function generateBriefWithGroq(data: HubData): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const client = new Groq({ apiKey });
  const prompt = buildPrompt(data);

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: "You are an organizational operations assistant. Generate concise, actionable weekly briefs in markdown format.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Groq");
  }

  return content.trim();
}

async function storeWeeklyBrief(
  hubId: string,
  weekStart: Date,
  weekEnd: Date,
  content: string
): Promise<void> {
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const existing = await prisma.weeklyBrief.findFirst({
    where: {
      departmentId: hubId,
      weekStart: weekStart,
    },
  });

  if (existing) {
    await prisma.weeklyBrief.update({
      where: { id: existing.id },
      data: {
        content,
        weekEnd: weekEnd,
        generatedAt: new Date(),
      },
    });
  } else {
    await prisma.weeklyBrief.create({
      data: {
        departmentId: hubId,
        weekStart: weekStart,
        weekEnd: weekEnd,
        content,
        generatedAt: new Date(),
      },
    });
  }
}

async function sendBriefToSlack(hubName: string, content: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 Weekly Brief — ${hubName}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: content.slice(0, 2800) },
    },
  ];

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Weekly Brief for ${hubName}`,
      blocks,
    }),
  });
}

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const hubs = await prisma.department.findMany({
    where: {
      parentDepartmentId: { not: null },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: string[] = [];
  const errors: string[] = [];

  for (const hub of hubs) {
    try {
      const data = await fetchHubData(hub.id, weekStart, weekEnd);

      const briefResult = await withRetry(
        () => generateBriefWithGroq(data),
        { label: `weekly-brief-${hub.name}`, maxRetries: 2 }
      );

      if (!briefResult.success) {
        errors.push(`[${hub.name}] Groq failed: ${briefResult.error}`);
        continue;
      }

      await storeWeeklyBrief(hub.id, weekStart, weekEnd, briefResult.data);
      results.push(`[${hub.name}] Brief generated and stored`);

      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        try {
          await sendBriefToSlack(hub.name, briefResult.data);
          results.push(`[${hub.name}] Sent to Slack`);
        } catch (slackErr) {
          logError("weekly-brief.slack-failed", slackErr, { hubId: hub.id });
          errors.push(`[${hub.name}] Slack failed: ${slackErr instanceof Error ? slackErr.message : String(slackErr)}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError("weekly-brief.hub-failed", err, { hubId: hub.id });
      errors.push(`[${hub.name}] Failed: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    hubsProcessed: hubs.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}