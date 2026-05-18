import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma } from "@orgos/db";
import { ApprovalsClient } from "@/modules/approvals/components/ApprovalsClient";

export default async function ApprovalsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { role, departmentId, id: userId } = sessionUser;

  if (role === "INSTRUCTOR") {
    redirect(`/departments/${departmentId}/instructors/${userId}`);
  }

  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  const [editRequests, pendingActions] = await Promise.all([
    accessibleIds.length > 0
      ? prisma.entryEditRequest.findMany({
          where: {
            status: "PENDING",
            entry: { departmentId: { in: accessibleIds } },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            note: true,
            createdAt: true,
            entry: {
              select: {
                id: true,
                date: true,
                quickSummary: true,
                reportType: true,
                user: { select: { id: true, name: true } },
              },
            },
            requestedBy: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.pendingAction.findMany({
          where: {
            departmentId: { in: accessibleIds },
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            actionType: true,
            rationale: true,
            priority: true,
            urgency: true,
            expiresAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <ApprovalsClient
      editRequests={editRequests as never[]}
      pendingActions={pendingActions as never[]}
      userRole={role}
      userDepartmentId={departmentId}
    />
  );
}