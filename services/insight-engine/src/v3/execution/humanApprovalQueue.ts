import { prisma } from "@orgos/db";
import type { ActionPlan } from "@orgos/shared-types";

/**
 * Persists action plans that require human approval.
 * Returns the created record ID for audit tracing.
 *
 * Nothing irreversible executes until a human calls approveAction().
 */
export async function enqueueForApproval(plan: ActionPlan): Promise<string> {
  const record = await prisma.pendingAction.create({
    data: {
      departmentId:  plan.departmentId,
      actionType:    plan.actionType,
      target:        plan.target,
      priority:      plan.priority,
      urgency:       plan.urgency,
      executionMode: plan.executionMode,
      rationale:     plan.rationale,
      payload:       plan.payload,
      forecastRunId: plan.forecastRunId,
      expiresAt:     plan.expiresAt,
    },
    select: { id: true },
  });
  return record.id;
}

export async function approveAction(
  pendingActionId: string,
  approvedById: string,
): Promise<void> {
  await prisma.pendingAction.update({
    where: { id: pendingActionId },
    data: { status: "APPROVED", approvedById: approvedById || null },
  });
}

export async function rejectAction(
  pendingActionId: string,
  rejectedById: string,
): Promise<void> {
  await prisma.pendingAction.update({
    where: { id: pendingActionId },
    data: { status: "REJECTED", rejectedById: rejectedById || null },
  });
}

/** Marks expired pending actions — called by a scheduled job. */
export async function expireStaleActions(): Promise<number> {
  const result = await prisma.pendingAction.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data:  { status: "EXPIRED" },
  });
  return result.count;
}

export async function getPendingActions(departmentId?: string) {
  return prisma.pendingAction.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: new Date() },
      ...(departmentId ? { departmentId } : {}),
    },
    orderBy: [{ priority: "asc" }, { urgency: "asc" }],
  });
}
