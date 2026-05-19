"use server";

import { prisma, AutomationLevel } from "@orgos/db";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@orgos/utils";
import { requireAccess } from "@/lib/auth/requireAccess";
import { z } from "zod";

const GOVERNANCE_ADMIN_ROLES = ["COUNTRY_DIRECTOR", "ADMIN"];

const policySchema = z.object({
  departmentId: z.string().optional(),
  automationLevel: z.enum(["FULL", "LIMITED", "LOCKED"]),
  maxAutoRiskThreshold: z.number().min(0).max(1),
  allowedAutoActions: z.array(z.string()),
  forbiddenActions: z.array(z.string()),
  active: z.boolean(),
  effectiveFrom: z.string().min(1),
  setByUserId: z.string(),
});

export async function createOrUpdatePolicy(
  data: unknown,
  existingId?: string,
): Promise<ActionResult<void>> {
  const { user } = await requireAccess(GOVERNANCE_ADMIN_ROLES);

  const parsed = policySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const policyData = {
    departmentId: parsed.data.departmentId ?? null,
    automationLevel: parsed.data.automationLevel as AutomationLevel,
    maxAutoRiskThreshold: parsed.data.maxAutoRiskThreshold,
    allowedAutoActions: parsed.data.allowedAutoActions as unknown as object,
    forbiddenActions: parsed.data.forbiddenActions as unknown as object,
    active: parsed.data.active,
    effectiveFrom: new Date(parsed.data.effectiveFrom),
    setByUserId: user.id,
  };

  if (existingId) {
    await prisma.boardPolicy.update({ where: { id: existingId }, data: policyData });
  } else {
    await prisma.boardPolicy.create({ data: policyData });
  }

  revalidatePath("/governance");
  return { success: true, data: undefined };
}

export async function togglePolicyActive(
  id: string,
  active: boolean,
): Promise<ActionResult<void>> {
  await requireAccess(GOVERNANCE_ADMIN_ROLES);
  await prisma.boardPolicy.update({ where: { id }, data: { active } });
  revalidatePath("/governance");
  return { success: true, data: undefined };
}
