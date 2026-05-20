import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma } from "@orgos/db";

export async function GET(): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, departmentId } = sessionUser;
  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  if (role === "INSTRUCTOR" || accessibleIds.length === 0) {
    return NextResponse.json([]);
  }

  const departments = await prisma.department.findMany({
    where: { id: { in: accessibleIds } },
    select: { id: true, name: true, parentDepartmentId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}