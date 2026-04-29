"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";

export async function addEntryComment(
  entryId: string,
  authorId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  if (!body.trim()) {
    return { success: false, error: "Comment cannot be empty." };
  }

  const comment = await prisma.entryComment.create({
    data: { entryId, authorId, body: body.trim() },
    select: { id: true },
  });

  return { success: true, data: { id: comment.id } };
}
