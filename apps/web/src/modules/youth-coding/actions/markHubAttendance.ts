"use server";

import { prisma } from "@orgos/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateToken(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(16).toString("hex");
  return `${datePart}_${randomPart}`;
}

async function getClientIP(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

export async function getOrCreateTodaySession(departmentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let session = await prisma.attendanceSession.findUnique({
    where: { departmentId_date: { departmentId, date: today } },
    include: { records: { include: { student: { select: { id: true, name: true } } } } },
  });

  if (!session) {
    const token = generateToken();
    session = await prisma.attendanceSession.create({
      data: { departmentId, date: today, token },
      include: { records: { include: { student: { select: { id: true, name: true } } } } },
    });
  }

  return session;
}

export async function getTodaySession(departmentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.attendanceSession.findUnique({
    where: { departmentId_date: { departmentId, date: today } },
    include: { records: { include: { student: { select: { id: true, name: true } } } } },
  });
}

export async function bindDeviceToSession(sessionId: string) {
  const ip = await getClientIP();
  if (!ip) return { ok: false, error: "Could not determine device IP" } as const;

  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Session not found" } as const;

  if (session.deviceIP && session.deviceIP !== ip) {
    return {
      ok: false,
      error: "This attendance session is already in use on another device.",
      bound: true,
    } as const;
  }

  if (!session.deviceIP) {
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { deviceIP: ip },
    });
  }

  return { ok: true } as const;
}

export async function recordCheckIn(sessionId: string, studentId: string) {
  const ip = await getClientIP();
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });

  if (!session) return { ok: false, error: "Session not found" } as const;
  if (session.deviceIP && ip && session.deviceIP !== ip) {
    return { ok: false, error: "Unauthorized device" } as const;
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
  if (existing) return { ok: false, error: "Already checked in" } as const;

  await prisma.attendanceRecord.create({
    data: { sessionId, studentId },
  });

  revalidatePath("/yc/attendance");
  return { ok: true } as const;
}
