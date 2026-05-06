import { z } from "zod";

export const studentRegistrationSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(25),
  gender: z.enum(["M", "F", "Other"]),
  school: z.string().min(1),
  grade: z.string().min(1),
  community: z.string().min(1),
});

export const sessionPhase1Schema = z.object({
  date: z.string().date(),
  lessonNumber: z.number().int().min(1),
  projectName: z.string().min(1),
  school: z.string().min(1),
  community: z.string().min(1),
  instructorIds: z.array(z.string()).min(1, "At least one instructor required"),
});

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  present: z.boolean(),
  projectStatus: z.enum(["COMPLETE", "NOT_COMPLETE"]),
});

export const sessionSubmissionSchema = z.object({
  phase1: sessionPhase1Schema,
  attendance: z.array(attendanceRecordSchema),
  newStudents: z.array(studentRegistrationSchema).optional(),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
export type SessionSubmissionInput = z.infer<typeof sessionSubmissionSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type SessionPhase1Input = z.infer<typeof sessionPhase1Schema>;
