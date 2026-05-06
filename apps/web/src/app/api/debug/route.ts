import { NextResponse } from "next/server";
import { prisma } from "@orgos/db";
import fs from "fs";
import path from "path";

const SEARCH_PATHS = [
  "/var/task/node_modules/.prisma/client",
  "/var/task/apps/web/.next/server",
  "/var/task/apps/web/.prisma/client",
  path.join(process.cwd(), "node_modules/.prisma/client"),
  path.join(process.cwd(), ".next/server"),
  path.join(process.cwd(), ".prisma/client"),
];

function findEngines() {
  const results: Record<string, string[]> = {};
  for (const dir of SEARCH_PATHS) {
    try {
      const files = fs.readdirSync(dir);
      const nodes = files.filter(f => f.endsWith(".node") || f.includes("engine"));
      if (nodes.length > 0) results[dir] = nodes;
    } catch {
      // skip
    }
  }
  return results;
}

export async function GET() {
  const engines = findEngines();
  try {
    const user = await prisma.user.findFirst({ select: { id: true, email: true } });
    return NextResponse.json({ ok: true, user, engines, cwd: process.cwd() });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({
      ok: false,
      error: err.message.substring(0, 400),
      engines,
      cwd: process.cwd(),
    }, { status: 500 });
  }
}
