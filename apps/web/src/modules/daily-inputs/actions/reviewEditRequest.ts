"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function reviewEditRequest(
  requestId: string,
  decision: "APPROVED" | "DENIED",
  reviewNote?: string,
): Promise<ActionResult<{ id: string }>> {
  const sessionUser = await requireSession();
  const updated = await prisma.entryEditRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedById: sessionUser.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
  });

  return { success: true, data: { id: updated.id } };
}
