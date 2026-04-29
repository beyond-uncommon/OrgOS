import { prisma } from "@orgos/db";
import type { OrgNode } from "@orgos/shared-types";
import { ROLE_TO_ORG_NODE } from "./orgStructure.js";
import { hasAuthority } from "./orgStructure.js";

export interface ApprovalQueueEntry {
  id: string;
  actionType: string;
  departmentId: string;
  priority: number;
  urgency: string;
  rationale: string;
  requiredApprovalLevel: OrgNode;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Returns all pending actions that the given user has authority to approve.
 * Filters by the user's OrgNode level — only returns actions at or below their authority.
 */
export async function getPendingActionsForApprover(userId: string): Promise<ApprovalQueueEntry[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  const approverNode = ROLE_TO_ORG_NODE[user.role];

  const pending = await prisma.pendingAction.findMany({
    where: {
      status:    "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return pending
    .filter((action) => {
      // PendingAction doesn't store requiredApprovalLevel — it lives in GovernanceAuditRecord.
      // We re-derive from priority: P0 = EXECUTIVE, P1 = DEPT_HEAD, P2/P3 = PROGRAM_LEAD.
      const required = derivedRequiredLevel(action.priority);
      return hasAuthority(approverNode, required);
    })
    .map((action) => ({
      id:                    action.id,
      actionType:            action.actionType,
      departmentId:          action.departmentId,
      priority:              action.priority,
      urgency:               action.urgency,
      rationale:             action.rationale,
      requiredApprovalLevel: derivedRequiredLevel(action.priority),
      expiresAt:             action.expiresAt,
      createdAt:             action.createdAt,
    }));
}

function derivedRequiredLevel(priority: number): OrgNode {
  if (priority === 0) return "EXECUTIVE";
  if (priority === 1) return "DEPARTMENT_HEAD";
  return "PROGRAM_LEAD";
}
