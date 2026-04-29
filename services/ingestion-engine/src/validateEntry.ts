import { dailyEntrySchema, type DailyEntryInput } from "./schema.js";
import type { ActionResult } from "@orgos/utils";

export function validateEntry(input: unknown): ActionResult<DailyEntryInput> {
  const parsed = dailyEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  return { success: true, data: parsed.data };
}
