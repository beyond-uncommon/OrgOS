import { cookies } from "next/headers";
import { prisma } from "@orgos/db";

const COOKIE_NAME = "orgos_demo_user";

export async function getSessionUser() {
  const jar = await cookies();
  const userId = jar.get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
