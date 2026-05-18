"use server";

import { prisma, PendingActionStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function approvePendingAction(
  pendingActionId: string,
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: PendingActionStatus.APPROVED, approvedById: sessionUser.id },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function rejectPendingAction(
  pendingActionId: string,
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();
  try {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: PendingActionStatus.REJECTED, rejectedById: sessionUser.id },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
