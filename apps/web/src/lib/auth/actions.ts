"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@orgos/db";
import { getSessionCookieName } from "./session";
import { redirectByRole } from "./redirect-by-role";
import { getDemoPasswords } from "./demo-passwords";

async function setSessionAndRedirect(userId: string, role: string, departmentId: string | null) {
  const jar = await cookies();
  jar.set(getSessionCookieName(), `${role}:${userId}`, {
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

  if (!email.endsWith("@uncommon.org")) {
    return { error: "Only @uncommon.org accounts are allowed." };
  }

  const expected = getDemoPasswords()[email];
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

export async function switchUser(email: string) {
  if (!email.endsWith("@uncommon.org")) return;

  const expected = getDemoPasswords()[email];
  if (!expected) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return;

  const jar = await cookies();
  jar.set(getSessionCookieName(), `${user.role}:${user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirect("/");
}
