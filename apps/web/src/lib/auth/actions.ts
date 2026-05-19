"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@orgos/db";
import { getSessionCookieName } from "./session";
import { redirectByRole } from "./redirect-by-role";
import { getDemoPasswords } from "./demo-passwords";

function getRouteForRole(role: string, departmentId: string | null, userId: string): string {
  const ROLE_ROUTE: Record<string, string> = {
    HEAD_OF_OPERATIONS: "/roles/head-of-operations",
    HEAD_OF_DESIGN: "/roles/head-of-design",
    HEAD_OF_DEVELOPMENT: "/roles/head-of-development",
    SAFEGUARDING: "/roles/safeguarding",
    M_AND_E: "/roles/me",
    MARKETING_COMMS_MANAGER: "/roles/marketing",
    BUSINESS_DEVELOPMENT_MANAGER: "/roles/business-dev",
    BUSINESS_DEVELOPMENT_ASSOCIATE: "/roles/business-dev-associate",
    CAREER_DEVELOPMENT_OFFICER: "/roles/career-dev",
    REGIONAL_HUB_LEAD: "/roles/regional-hub",
    HR_OFFICER: "/roles/hr",
    FINANCE_ADMIN_OFFICER: "/roles/finance",
  };
  const route = ROLE_ROUTE[role];
  if (route) return route;
  switch (role) {
    case "INSTRUCTOR": return `/departments/${departmentId}/instructors/${userId}`;
    case "HUB_LEAD": return `/departments/${departmentId}`;
    case "BOOTCAMP_MANAGER": return `/bootcamps/${departmentId}`;
    case "YOUTH_CODING_MANAGER": return `/youth-coding`;
    case "TEACHER_TRAINING_COORDINATOR": return `/programs/${departmentId}`;
    case "PROGRAM_MANAGER": return `/programs`;
    case "COUNTRY_DIRECTOR":
    case "ADMIN": return "/org";
    case "PARTNER": return "/portal";
    case "STUDENT": return "/student";
    default: return "/coming-soon";
  }
}

async function setCookie(userId: string, role: string) {
  const jar = await cookies();
  jar.set(getSessionCookieName(), `${role}:${userId}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

type LoginResult = { error: string; redirect?: never } | { error?: never; redirect: string } | null;

export async function login(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
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

  await setCookie(user.id, user.role);
  const route = getRouteForRole(user.role, user.departmentId, user.id);
  return { redirect: route };
}

export async function loginAs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, departmentId: true },
  });
  if (!user) return;
  await setCookie(user.id, user.role);
  redirectByRole(user.role, user.departmentId, user.id);
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

  await setCookie(user.id, user.role);
  redirect("/");
}
