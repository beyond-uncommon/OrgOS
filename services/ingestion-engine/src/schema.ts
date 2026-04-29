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
});

export type DailyEntryInput = z.infer<typeof dailyEntrySchema>;
