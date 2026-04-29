export { getAccessibleDepartmentIds } from "./getAccessibleDepartmentIds.js";
export { env } from "./env.js";

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Metric Normalization ─────────────────────────────────────────────────────

export function normalizeEngagementScore(value: unknown): number {
  if (value === "LOW")    return 0;
  if (value === "MEDIUM") return 1;
  if (value === "HIGH")   return 2;
  throw new Error(`Unknown engagement_score value: ${String(value)}`);
}

// ─── Structured Logger ────────────────────────────────────────────────────────

export function log<TEvent extends string>(event: TEvent, context: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), ...context }));
}

export function logError<TEvent extends string>(event: TEvent, error: unknown, context: Record<string, unknown> = {}): void {
  console.error(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      ...context,
    })
  );
}

// ─── Type Utilities ───────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function err<T>(error: string): ActionResult<T> {
  return { success: false, error };
}
