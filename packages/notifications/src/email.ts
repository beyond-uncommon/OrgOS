import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "OrgOS <no-reply@uncommon.org>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface EmailResult {
  success: boolean;
  error?: string;
}

function baseStyle(): string {
  return "font-family:system-ui,sans-serif;background-color:#F8F9FC;margin:0;padding:40px 20px;";
}

function cardStyle(): string {
  return "max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;";
}

function headerStyle(): string {
  return "background:#0747A1;padding:24px 32px;";
}

function wrapHtml(title: string, bodyContent: string, ctaText?: string, ctaHref?: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="${baseStyle()}"><div style="${cardStyle()}"><div style="${headerStyle()}"><p style="margin:0;font-size:22px;font-weight:600;color:#FFFFFF;letter-spacing:-0.01em;">Org<span style="color:#60A5FA;">OS</span></p></div>${bodyContent}
${ctaText && ctaHref ? `<div style="padding:0 32px 28px;"><a href="${ctaHref}" style="display:inline-block;background:#0747A1;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px;">${ctaText}</a></div>` : ""}
<div style="padding:20px 32px;border-top:1px solid #E5E7EB;text-align:center;"><p style="margin:0;font-size:12px;color:#9CA3AF;">This is an automated message from OrgOS. No need to reply.</p></div></div></body></html>`;
}

export async function sendAlertNotification(
  recipientEmail: string,
  recipientName: string,
  alertType: string,
  severity: string,
  description: string,
  hubName: string,
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping alert email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const bodyContent = `<div style="padding:32px;"><h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">${severity} Alert — ${alertType.replace(/_/g, " ")}</h1><p style="margin:0 0 20px;font-size:14px;color:#6B7280;">Hi ${recipientName},</p><div style="background:#FEF2F2;border:1px solid #DC2626;border-radius:8px;padding:16px 20px;margin-bottom:20px;"><p style="margin:0;font-size:14px;color:#374151;"><strong>Hub:</strong> ${hubName}<br/><strong>Severity:</strong> ${severity}<br/><strong>Description:</strong> ${description}</p></div></div>`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `[OrgOS ${severity}] ${alertType.replace(/_/g, " ")} — ${hubName}`,
      html: wrapHtml("Alert Notification", bodyContent, "View Alerts", `${APP_URL}/interventions`),
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

export async function sendInterventionAssigned(
  recipientEmail: string,
  recipientName: string,
  issueType: string,
  severity: string,
  hubName: string,
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping intervention email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const bodyContent = `<div style="padding:32px;"><h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Intervention Assigned</h1><p style="margin:0 0 20px;font-size:14px;color:#6B7280;">Hi ${recipientName},</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin-bottom:20px;"><p style="margin:0;font-size:14px;color:#374151;"><strong>Hub:</strong> ${hubName}<br/><strong>Issue:</strong> ${issueType.replace(/_/g, " ")}<br/><strong>Severity:</strong> ${severity}</p></div><p style="margin:0;font-size:14px;color:#6B7280;">An intervention has been assigned to you. Please review and take appropriate action.</p></div>`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `[OrgOS] Intervention Assigned — ${hubName}`,
      html: wrapHtml("Intervention Assigned", bodyContent, "View Interventions", `${APP_URL}/interventions`),
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
