"use server";

import { prisma } from "@orgos/db";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@orgos/utils";
import { requireAccess } from "@/lib/auth/requireAccess";
import { z } from "zod";

const FUNDING_MANAGER_ROLES = [
  "COUNTRY_DIRECTOR", "ADMIN", "FINANCE_ADMIN_OFFICER",
  "BUSINESS_DEVELOPMENT_MANAGER", "BUSINESS_DEVELOPMENT_ASSOCIATE",
];

const fundingSchema = z.object({
  amount: z.number().positive(),
  source: z.string().min(1),
  description: z.string().optional(),
  receivedAt: z.string().min(1),
  programId: z.string().optional(),
});

export async function createFundingRecord(
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAccess(FUNDING_MANAGER_ROLES);

  const parsed = fundingSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const record = await prisma.fundingRecord.create({
    data: {
      amount: parsed.data.amount,
      source: parsed.data.source,
      description: parsed.data.description ?? null,
      receivedAt: new Date(parsed.data.receivedAt),
      programId: parsed.data.programId ?? null,
    },
  });

  revalidatePath("/funding");
  revalidatePath("/impact");
  revalidatePath("/portal");
  return { success: true, data: { id: record.id } };
}

export async function updateFundingRecord(
  id: string,
  data: unknown,
): Promise<ActionResult<void>> {
  await requireAccess(FUNDING_MANAGER_ROLES);

  const parsed = fundingSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  await prisma.fundingRecord.update({
    where: { id },
    data: {
      amount: parsed.data.amount,
      source: parsed.data.source,
      description: parsed.data.description ?? null,
      receivedAt: new Date(parsed.data.receivedAt),
      programId: parsed.data.programId ?? null,
    },
  });

  revalidatePath("/funding");
  revalidatePath("/impact");
  revalidatePath("/portal");
  return { success: true, data: undefined };
}

export async function deleteFundingRecord(
  id: string,
): Promise<ActionResult<void>> {
  await requireAccess(FUNDING_MANAGER_ROLES);
  await prisma.fundingRecord.delete({ where: { id } });

  revalidatePath("/funding");
  revalidatePath("/impact");
  revalidatePath("/portal");
  return { success: true, data: undefined };
}
