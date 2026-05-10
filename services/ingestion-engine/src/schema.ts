import { z } from "zod";

export const dailyEntrySchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().min(1),
  date: z.coerce.date(),
  attendanceStatus: z.string().min(1).max(500),
  outputCompleted: z.string().min(1).max(2000),
  blockers: z.string().max(2000).default(""),
  engagementNotes: z.string().max(2000).default(""),
  quickSummary: z.string().min(1).max(1000),
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
  dropoutReasons: z.record(z.string(), z.string()).optional(),
});

export type DailyEntryInput = z.infer<typeof dailyEntrySchema>;
