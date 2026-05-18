"use server";

import { prisma, EditRequestStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function requestEntryEdit(
  entryId: string,
  note: string,
): Promise<ActionResult<{ id: string }>> {
  const sessionUser = await requireSession();
  const requestedById = sessionUser.id;

  const existing = await prisma.entryEditRequest.findFirst({
    where: { entryId, requestedById, status: EditRequestStatus.PENDING },
  });
  if (existing) {
    return { success: false, error: "A pending edit request already exists for this entry." };
  }

  const request = await prisma.entryEditRequest.create({
    data: { entryId, requestedById, note },
  });

  return { success: true, data: { id: request.id } };
}
