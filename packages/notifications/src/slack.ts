export interface SlackAlertPayload {
  hubName: string;
  alertType: string;
  severity: string;
  description: string;
  departmentId: string;
}

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? "";

function buildAlertMessage(payload: SlackAlertPayload) {
  const colors: Record<string, string> = {
    CRITICAL: "#DC2626",
    HIGH: "#EA580C",
    MEDIUM: "#F59E0B",
    LOW: "#10B981",
  };

  return {
    attachments: [
      {
        color: colors[payload.severity] ?? "#6B7280",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `🚨 ${payload.severity} Anomaly Detected`, emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Hub:* ${payload.hubName}` },
              { type: "mrkdwn", text: `*Type:* ${payload.alertType.replace(/_/g, " ")}` },
              { type: "mrkdwn", text: `*Severity:* ${payload.severity}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: payload.description },
          },
        ],
      },
    ],
  };
}

export async function sendSlackAlert(payload: SlackAlertPayload): Promise<void> {
  if (!WEBHOOK_URL) return;
  const body = buildAlertMessage(payload);
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendSlackMessage(text: string): Promise<void> {
  if (!WEBHOOK_URL) return;
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
