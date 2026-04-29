import { Role, ORG_HIERARCHY } from "@orgos/shared-types";
import type { OrgNode } from "@orgos/shared-types";

/** Maps each Prisma Role to its OrgNode level */
export const ROLE_TO_ORG_NODE: Record<Role, OrgNode> = {
  [Role.ADMIN]:              "EXECUTIVE",
  [Role.HEAD_OF_OPERATIONS]: "EXECUTIVE",
  [Role.PROGRAM_MANAGER]:    "DEPARTMENT_HEAD",
  [Role.PROGRAM_LEAD]:       "PROGRAM_LEAD",
  [Role.DEPARTMENT_HEAD]:    "DEPARTMENT_HEAD",
  [Role.INSTRUCTOR]:         "INSTRUCTOR",
};

/** Returns true if `candidate` has equal or greater authority than `required` */
export function hasAuthority(candidate: OrgNode, required: OrgNode): boolean {
  return ORG_HIERARCHY.indexOf(candidate) <= ORG_HIERARCHY.indexOf(required);
}

/** Returns the escalation path from `from` (exclusive, upward) to BOARD */
export function buildEscalationPath(from: OrgNode): OrgNode[] {
  const idx = ORG_HIERARCHY.indexOf(from);
  return ORG_HIERARCHY.slice(0, idx) as OrgNode[];
}
