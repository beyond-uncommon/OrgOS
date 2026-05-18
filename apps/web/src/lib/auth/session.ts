import { cookies } from "next/headers";
import { prisma } from "@orgos/db";

const COOKIE_NAME = "orgos_demo_user";

export async function getSessionUser() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const userId = raw.includes(":") ? (raw.split(":")[1] ?? raw) : raw;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export type SessionCookie = { role: string; userId: string };

export function parseSessionCookie(raw: string): SessionCookie | null {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { role: parts[0], userId: parts[1] };
}
