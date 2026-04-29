"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";

export async function reviewEditRequest(
  requestId: string,
  reviewedById: string,
  decision: "APPROVED" | "DENIED",
  reviewNote?: string,
): Promise<ActionResult<{ id: string }>> {
  const updated = await prisma.entryEditRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedById,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
  });

  return { success: true, data: { id: updated.id } };
}
