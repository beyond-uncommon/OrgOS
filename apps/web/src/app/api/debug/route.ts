import { NextResponse } from "next/server";
import { prisma } from "@orgos/db";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, email: true } });
    return NextResponse.json({ ok: true, user });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack?.substring(0, 500) }, { status: 500 });
  }
}
