"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";

export async function approvePendingAction(
  pendingActionId: string,
  approverId: string,
): Promise<ActionResult<void>> {
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: "APPROVED", approvedById: approverId || null },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function rejectPendingAction(
  pendingActionId: string,
  rejectorId: string,
): Promise<ActionResult<void>> {
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: "REJECTED", rejectedById: rejectorId || null },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
