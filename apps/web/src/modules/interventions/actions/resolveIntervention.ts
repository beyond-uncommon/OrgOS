"use server";

import { prisma, InterventionStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function resolveIntervention(
  interventionId: string,
  notes?: string,
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();
  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: InterventionStatus.RESOLVED,
        resolvedAt: new Date(),
        notes: notes ?? "",
      },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateInterventionStatus(
  interventionId: string,
  status: InterventionStatus,
  notes?: string,
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();
  try {
    const data: { status: InterventionStatus; notes?: string; resolvedAt?: Date } = { status };
    if (notes) data.notes = notes;
    if (status === InterventionStatus.RESOLVED) data.resolvedAt = new Date();
    await prisma.intervention.update({ where: { id: interventionId }, data });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}