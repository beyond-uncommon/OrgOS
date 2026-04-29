import { prisma, PendingActionStatus, EditRequestStatus } from "@orgos/db";

export interface PendingActionRow {
  id: string;
  actionType: string;
  rationale: string;
  priority: number;
  urgency: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function getPendingActionsForDepartment(
  departmentId: string,
): Promise<PendingActionRow[]> {
  return prisma.pendingAction.findMany({
    where: {
      departmentId,
      status: PendingActionStatus.PENDING,
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
  });
}

export async function getPendingEditRequests(departmentId: string) {
  return prisma.entryEditRequest.findMany({
    where: {
      status: EditRequestStatus.PENDING,
      entry: { departmentId },
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
  });
}

export async function getApproverByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
}
