import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "OrgOS <no-reply@uncommon.org>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface EmailResult {
  success: boolean;
  error?: string;
}

async function send(opts: { to: string; subject: string; html: string }): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", opts.to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] exception:", msg);
    return { success: false, error: msg };
  }
}

const baseStyle = `
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background-color: #F8F9FC;
  margin: 0;
  padding: 40px 20px;
`;

const cardStyle = `
  max-width: 560px;
  margin: 0 auto;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
`;

const headerStyle = `
  background: #0747A1;
  padding: 24px 32px;
`;

const bodyStyle = `
  padding: 32px;
`;

const footerStyle = `
  padding: 20px 32px;
  border-top: 1px solid #E5E7EB;
  text-align: center;
`;

function wrapHtml(title: string, headerAccent: string, bodyContent: string, ctaText?: string, ctaHref?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      <p style="margin:0;font-size:22px;font-weight:600;color:#FFFFFF;letter-spacing:-0.01em;">
        Org<span style="color:#60A5FA;">OS</span>
      </p>
    </div>
    ${bodyContent}
    ${ctaText && ctaHref ? `
    <div style="padding: 0 32px 28px;">
      <a href="${ctaHref}"
         style="display:inline-block;background:#0747A1;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px;">
        ${ctaText}
      </a>
    </div>` : ""}
    <div style="${footerStyle}">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        This is an automated message from OrgOS. No need to reply.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendSubmissionReminder(instructorName: string, instructorEmail: string, departmentName: string): Promise<EmailResult> {
  const bodyContent = `
    <div style="${bodyStyle}">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">
        Daily Report Reminder
      </h1>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">
        Hi ${instructorName}, just a quick reminder to submit your daily operational report.
      </p>
      <div style="background:#F8FAFF;border:1px solid #DBEAFE;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#0747A1;letter-spacing:0.06em;text-transform:uppercase;">
          Today&apos;s Summary
        </p>
        <p style="margin:0;font-size:14px;color:#374151;">
          📋 <strong>Hub:</strong> ${departmentName}<br/>
          🕐 <strong>Takes only 1–2 minutes</strong>
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#6B7280;">
        Your daily input helps the system track engagement, flag risks, and generate reports automatically — no manual summaries needed.
      </p>
    </div>`;

  return send({
    to: instructorEmail,
    subject: `[OrgOS] Daily Report Reminder — ${departmentName}`,
    html: wrapHtml("Daily Report Reminder", "#0747A1", bodyContent, "Submit Now", `${APP_URL}/submit`),
  });
}

export async function sendMissedDeadline(
  instructorName: string,
  instructorEmail: string,
  departmentName: string,
  submissionCount: number,
  missedDays: number
): Promise<EmailResult> {
  const urgency = missedDays >= 3
    ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#DC2626;font-weight:600;">
          ⚠️ You have ${missedDays} days of missing daily reports. This is impacting organizational visibility.
        </p>
      </div>`
    : `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#C2410C;font-weight:600;">
          ⚠️ You missed ${missedDays} daily report${missedDays !== 1 ? "s" : ""} this week.
        </p>
      </div>`;

  const bodyContent = `
    <div style="${bodyStyle}">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">
        Daily Report Missing
      </h1>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">
        Hi ${instructorName}, your daily operational report has not been submitted yet.
      </p>
      ${urgency}
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6B7280;letter-spacing:0.06em;text-transform:uppercase;">
          Status
        </p>
        <p style="margin:0;font-size:14px;color:#374151;">
          <strong>Hub:</strong> ${departmentName}<br/>
          <strong>Reports submitted this week:</strong> ${submissionCount}<br/>
          <strong>Reports missing:</strong> ${missedDays}
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#6B7280;">
        Please submit your daily report as soon as possible. Consistent daily inputs are the backbone of OrgOS reporting — everything flows from there.
      </p>
    </div>`;

  return send({
    to: instructorEmail,
    subject: `[OrgOS Action Required] Missing Daily Reports — ${departmentName}`,
    html: wrapHtml("Missing Daily Reports", "#DC2626", bodyContent, "Submit Now", `${APP_URL}/submit`),
  });
}

export async function sendBulkSubmissionReminder(
  emails: Array<{ name: string; email: string; departmentName: string }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping bulk reminder");
    return { sent: 0, failed: emails.length, errors: ["RESEND_API_KEY not configured"] };
  }

  const results = await Promise.allSettled(
    emails.map(e => sendSubmissionReminder(e.name, e.email, e.departmentName))
  );

  let sent = 0, failed = 0;
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.success) sent++;
    else {
      failed++;
      errors.push(r.status === "rejected" ? r.reason : (r.value as EmailResult).error ?? "unknown");
    }
  }
  return { sent, failed, errors };
}

export async function sendBulkMissedDeadline(
  emails: Array<{ name: string; email: string; departmentName: string; submissionCount: number; missedDays: number }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping bulk missed deadline");
    return { sent: 0, failed: emails.length, errors: ["RESEND_API_KEY not configured"] };
  }

  const results = await Promise.allSettled(
    emails.map(e => sendMissedDeadline(e.name, e.email, e.departmentName, e.submissionCount, e.missedDays))
  );

  let sent = 0, failed = 0;
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.success) sent++;
    else {
      failed++;
      errors.push(r.status === "rejected" ? r.reason : (r.value as EmailResult).error ?? "unknown");
    }
  }
  return { sent, failed, errors };
}