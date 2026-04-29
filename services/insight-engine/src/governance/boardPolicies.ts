import { prisma } from "@orgos/db";
import type { BoardPolicy } from "@orgos/shared-types";

/**
 * Fetches the active policy for a department.
 * Falls back to the org-wide policy (departmentId = null) if no dept-specific one exists.
 * Returns a safe default (LIMITED automation, conservative thresholds) if none found.
 */
export async function getActiveBoardPolicy(departmentId: string): Promise<BoardPolicy> {
  const policies = await prisma.boardPolicy.findMany({
    where: {
      active: true,
      OR: [{ departmentId }, { departmentId: null }],
    },
    orderBy: { departmentId: "desc" }, // dept-specific rows sort first (non-null > null in pg desc)
  });

  const policy = policies[0];

  if (!policy) {
    return {
      id:                   "default",
      departmentId:         null,
      automationLevel:      "LIMITED",
      maxAutoRiskThreshold: 0.6,
      allowedAutoActions:   ["baseline_documentation", "engagement_opportunity_flag"],
      forbiddenActions:     [],
    };
  }

  return {
    id:                   policy.id,
    departmentId:         policy.departmentId,
    automationLevel:      policy.automationLevel as "FULL" | "LIMITED" | "LOCKED",
    maxAutoRiskThreshold: policy.maxAutoRiskThreshold,
    allowedAutoActions:   policy.allowedAutoActions as string[],
    forbiddenActions:     policy.forbiddenActions as string[],
  };
}
