import { z } from "zod";

export type ReportType = "DAILY" | "INCIDENT" | "SESSION";

export const REPORT_TYPES: { type: ReportType; label: string; description: string; color: string }[] = [
  {
    type: "DAILY",
    label: "Daily Report",
    description: "Hub metrics, attendance, outputs, and engagement for the day.",
    color: "primary",
  },
  {
    type: "INCIDENT",
    label: "Incident Report",
    description: "Student conflict, safety issue, equipment failure, or any unplanned event.",
    color: "error",
  },
  {
    type: "SESSION",
    label: "Special Session",
    description: "Workshop, field trip, guest lecture, or any non-standard program session.",
    color: "success",
  },
];

export const dailyEntryFormSchema = z.object({
  date: z.coerce.date(),
  attendanceStatus: z.string().min(1, "Required").max(500),
  outputCompleted: z.string().min(1, "Required").max(2000),
  blockers: z.string().max(2000).default(""),
  engagementNotes: z.string().max(2000).default(""),
  quickSummary: z.string().min(1, "Required").max(1000),
  // Hub metrics
  totalStudents: z.coerce.number().int().min(0).optional(),
  studentsPresent: z.coerce.number().int().min(0).optional(),
  dropouts: z.coerce.number().int().min(0).optional(),
  maleStudents: z.coerce.number().int().min(0).optional(),
  femaleStudents: z.coerce.number().int().min(0).optional(),
  otherGender: z.coerce.number().int().min(0).optional(),
  averageAge: z.coerce.number().min(0).max(100).optional(),
  mentorshipPairs: z.coerce.number().int().min(0).optional(),
  engagementScore: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  guestsVisited: z.boolean().default(false),
  guestNotes: z.string().max(2000).optional(),
  reportType: z.enum(["DAILY", "INCIDENT", "SESSION"]).default("DAILY"),
  studentsInvolvedIds: z.array(z.string()).optional(),
  dropoutStudentIds: z.array(z.string()).optional(),
  dropoutReasons: z.record(z.string(), z.string()).optional(), // { studentId: reason }
});

export type DailyEntryFormValues = z.infer<typeof dailyEntryFormSchema>;
