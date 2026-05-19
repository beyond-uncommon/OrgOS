import { prisma } from "@orgos/db";
import { ApprovalsClient } from "@/modules/approvals/components/ApprovalsClient";
import { requireAccess } from "@/lib/auth/requireAccess";

export default async function ApprovalsPage() {
  const { user, departmentIds } = await requireAccess([
    "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
    "YOUTH_CODING_MANAGER", "COUNTRY_DIRECTOR", "ADMIN",
    "HEAD_OF_OPERATIONS", "M_AND_E", "SAFEGUARDING",
    "MARKETING_COMMS_MANAGER", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
    "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD",
    "TEACHER_TRAINING_COORDINATOR",
  ]);

  const [editRequests, pendingActions] = await Promise.all([
    departmentIds.length > 0
      ? prisma.entryEditRequest.findMany({
          where: {
            status: "PENDING",
            entry: { departmentId: { in: departmentIds } },
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
    departmentIds.length > 0
      ? prisma.pendingAction.findMany({
          where: {
            departmentId: { in: departmentIds },
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
      userRole={user.role}
      userDepartmentId={user.departmentId}
    />
  );
}