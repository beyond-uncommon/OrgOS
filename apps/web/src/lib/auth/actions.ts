"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@orgos/db";
import { getSessionCookieName } from "./session";
import { redirectByRole } from "./redirect-by-role";

const DEMO_PASSWORDS: Record<string, string> = {
  "alex.rivera@uncommon.org":  "instructor",
  "hublead@uncommon.org":      "hublead",
  "bootcamp@uncommon.org":     "bootcamp",
  "program@uncommon.org":      "program",
  "director@uncommon.org":     "director",
  "admin@uncommon.org":        "admin",
};

async function setSessionAndRedirect(userId: string, role: string, departmentId: string | null) {
  const jar = await cookies();
  jar.set(getSessionCookieName(), userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirectByRole(role, departmentId, userId);
}

export async function login(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const expected = DEMO_PASSWORDS[email];
  if (!expected || expected !== password) {
    return { error: "Invalid email or password." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return { error: "Account not found." };

  await setSessionAndRedirect(user.id, user.role, user.departmentId);
  return null;
}

export async function loginAs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return;
  await setSessionAndRedirect(user.id, user.role, user.departmentId);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(getSessionCookieName());
  redirect("/login");
}
