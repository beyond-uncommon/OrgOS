import { NextResponse } from "next/server";
import {
  sendSlackAlert,
  sendSlackSubmissionReminder,
  sendSlackMissedDeadline,
  sendSlackWeeklyDigest,
} from "@/lib/notifications/slack";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results = await Promise.allSettled([
    sendSlackAlert({
      hubName: "Lagos Hub",
      alertType: "DROPOUT_SPIKE",
      severity: "HIGH",
      description: "Dropout rate increased 40% over the last 3 days.",
      departmentId: "mock-dept-001",
    }),
    sendSlackSubmissionReminder({
      instructorName: "Amara Osei",
      hubName: "Accra Hub",
      departmentId: "mock-dept-002",
    }),
    sendSlackMissedDeadline({
      instructorName: "Kofi Mensah",
      hubName: "Nairobi Hub",
      missedDays: 3,
      departmentId: "mock-dept-003",
    }),
    sendSlackWeeklyDigest({
      hubName: "Kampala Hub",
      submissionRate: 72,
      alertCount: 2,
      topIssue: "Low engagement in afternoon sessions",
      departmentId: "mock-dept-004",
    }),
  ]);

  const summary = results.map((r, i) => ({
    notification: ["alert", "reminder", "missed_deadline", "weekly_digest"][i],
    status: r.status === "fulfilled" ? r.value : { success: false, error: String(r.reason) },
  }));

  return NextResponse.json({ sent: summary });
}
