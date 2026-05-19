import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { prisma } from "@orgos/db";
import { getAccessibleDepartmentIds } from "@orgos/utils";

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export interface AccessContext {
  user: AuthedUser;
  departmentIds: string[];
}

export async function requireAccess(allowedRoles: string[]): Promise<AccessContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!allowedRoles.includes(user.role)) redirect("/404");

  const departmentIds = await getAccessibleDepartmentIds(
    user.role,
    user.departmentId,
    prisma,
  );

  return { user, departmentIds };
}
