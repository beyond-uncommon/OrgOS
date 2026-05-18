"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function addEntryComment(
  entryId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  const sessionUser = await requireSession();
  if (!body.trim()) {
    return { success: false, error: "Comment cannot be empty." };
  }

  const comment = await prisma.entryComment.create({
    data: { entryId, authorId: sessionUser.id, body: body.trim() },
    select: { id: true },
  });

  return { success: true, data: { id: comment.id } };
}
