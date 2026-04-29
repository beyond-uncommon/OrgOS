import type { AnomalyResult } from "@orgos/shared-types";

interface MissingEntryUser {
  id: string;
  departmentId: string;
  consecutiveMissingDays?: number;
}

interface DetectMissingEntryInput {
  date: Date;
  departmentId: string;
  usersWithoutEntry: MissingEntryUser[];
}

export function detectMissingEntry({ date, departmentId, usersWithoutEntry }: DetectMissingEntryInput): AnomalyResult[] {
  return usersWithoutEntry.map((user) => ({
    anomalyType: "MISSING_ENTRY" as const,
    userId: user.id,
    departmentId,
    description: `No DailyEntry submitted by user ${user.id} for ${date.toISOString().split("T")[0]}`,
    detectedAt: new Date(),
    consecutiveDays: user.consecutiveMissingDays ?? 1,
  }));
}
