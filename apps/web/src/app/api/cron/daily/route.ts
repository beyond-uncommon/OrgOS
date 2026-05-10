import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  try {
    const { runEndOfDayChecks } = await import("@orgos/anomaly-detection");
    const date = new Date();
    await runEndOfDayChecks(date);
    results.push(`runEndOfDayChecks completed for ${date.toISOString().slice(0, 10)}`);
  } catch (err) {
    errors.push(`runEndOfDayChecks failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
