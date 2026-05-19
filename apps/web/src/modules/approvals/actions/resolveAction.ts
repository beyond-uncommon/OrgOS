"use server";

import { prisma, PendingActionStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireAccess } from "@/lib/auth/requireAccess";

const APPROVER_ROLES = [
  "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
  "YOUTH_CODING_MANAGER", "COUNTRY_DIRECTOR", "ADMIN",
  "HEAD_OF_OPERATIONS", "HEAD_OF_DESIGN", "HEAD_OF_DEVELOPMENT",
  "CAREER_DEVELOPMENT_OFFICER", "REGIONAL_HUB_LEAD",
  "TEACHER_TRAINING_COORDINATOR", "SAFEGUARDING", "M_AND_E",
];

export async function approvePendingAction(
  pendingActionId: string,
): Promise<ActionResult<void>> {
  const { user } = await requireAccess(APPROVER_ROLES);
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: PendingActionStatus.APPROVED, approvedById: user.id },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function rejectPendingAction(
  pendingActionId: string,
): Promise<ActionResult<void>> {
  const { user } = await requireAccess(APPROVER_ROLES);
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: PendingActionStatus.REJECTED, rejectedById: user.id },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function executePendingAction(
  pendingActionId: string,
): Promise<ActionResult<void>> {
  const { user } = await requireAccess(APPROVER_ROLES);
  try {
    const action = await prisma.pendingAction.findUnique({
      where: { id: pendingActionId },
      select: { status: true },
    });
    if (!action) return { success: false, error: "Action not found" };
    if (action.status !== PendingActionStatus.APPROVED) {
      return { success: false, error: "Only approved actions can be executed" };
    }
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: {
        status: PendingActionStatus.EXECUTED,
        executedAt: new Date(),
      },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
