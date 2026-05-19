interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text?: string }>;
}

export interface SlackResult {
  success: boolean;
  error?: string;
}

async function sendSlack(message: SlackMessage): Promise<SlackResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[slack] SLACK_WEBHOOK_URL not configured — skipping");
    return { success: false, error: "SLACK_WEBHOOK_URL not set" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[slack] send failed:", res.status, text);
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[slack] exception:", msg);
    return { success: false, error: msg };
  }
}

export async function sendSlackAlert(params: {
  hubName: string;
  alertType: string;
  severity: string;
  description: string;
  departmentId: string;
}): Promise<SlackResult> {
  const severityEmoji = params.severity === "CRITICAL" ? "🔴" : params.severity === "HIGH" ? "🟠" : "🟡";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgos.uncommon.org";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${severityEmoji} OrgOS Alert — ${params.alertType}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Hub:* ${params.hubName}\n*Severity:* ${params.severity}\n*Description:* ${params.description}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${appUrl}/departments/${params.departmentId}|View Dashboard>`,
      },
    },
  ];

  return sendSlack({ text: `[OrgOS] ${params.severity} alert: ${params.alertType} in ${params.hubName}`, blocks });
}

export async function sendSlackSubmissionReminder(params: {
  instructorName: string;
  hubName: string;
  departmentId: string;
}): Promise<SlackResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgos.uncommon.org";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📋 Daily Report Reminder" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${params.instructorName}* from *${params.hubName}* has not submitted today's report yet.\n\n<${appUrl}/submit|Submit Now>`,
      },
    },
  ];

  return sendSlack({
    text: `[OrgOS] Reminder: ${params.instructorName} (${params.hubName}) has not submitted today's report`,
    blocks,
  });
}

export async function sendSlackWeeklyDigest(params: {
  hubName: string;
  submissionRate: number;
  alertCount: number;
  topIssue: string;
  departmentId: string;
}): Promise<SlackResult> {
  const emoji = params.submissionRate === 100 ? "✅" : params.submissionRate >= 70 ? "🟡" : "🔴";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgos.uncommon.org";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} Weekly Digest — ${params.hubName}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Submission Rate:* ${params.submissionRate}%\n*Active Alerts:* ${params.alertCount}\n*Top Issue:* ${params.topIssue}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${appUrl}/departments/${params.departmentId}|View Dashboard>`,
      },
    },
  ];

  return sendSlack({
    text: `[OrgOS] Weekly digest for ${params.hubName}: ${params.submissionRate}% submission rate, ${params.alertCount} alerts`,
    blocks,
  });
}

export async function sendSlackMissedDeadline(params: {
  instructorName: string;
  hubName: string;
  missedDays: number;
  departmentId: string;
}): Promise<SlackResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgos.uncommon.org";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "⚠️ Missed Report Deadline" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${params.instructorName}* from *${params.hubName}* has missed *${params.missedDays}* daily report(s) this week.\n\nThis is impacting organizational visibility. Please follow up.`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${appUrl}/departments/${params.departmentId}/instructors/${params.instructorName}|View Instructor>`,
      },
    },
  ];

  return sendSlack({
    text: `[OrgOS] ${params.instructorName} (${params.hubName}) missed ${params.missedDays} daily reports`,
    blocks,
  });
}

export async function sendSlackBulkAlerts(
  alerts: Array<{ hubName: string; alertType: string; severity: string; description: string; departmentId: string }>
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    alerts.map(a => sendSlackAlert(a))
  );

  let sent = 0, failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.success) sent++;
    else failed++;
  }
  return { sent, failed };
}