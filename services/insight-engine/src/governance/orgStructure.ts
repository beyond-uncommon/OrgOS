import { Role, ORG_HIERARCHY } from "@orgos/shared-types";
import type { OrgNode } from "@orgos/shared-types";

/** Maps each Prisma Role to its OrgNode level */
export const ROLE_TO_ORG_NODE: Record<Role, OrgNode> = {
  [Role.INSTRUCTOR]:                    "INSTRUCTOR",
  [Role.HUB_LEAD]:                      "DEPARTMENT_HEAD",
  [Role.BOOTCAMP_MANAGER]:              "DEPARTMENT_HEAD",
  [Role.PROGRAM_MANAGER]:               "DEPARTMENT_HEAD",
  [Role.COUNTRY_DIRECTOR]:              "EXECUTIVE",
  [Role.HEAD_OF_DESIGN]:                "EXECUTIVE",
  [Role.HEAD_OF_DEVELOPMENT]:           "EXECUTIVE",
  [Role.YOUTH_CODING_MANAGER]:          "DEPARTMENT_HEAD",
  [Role.TEACHER_TRAINING_COORDINATOR]:  "DEPARTMENT_HEAD",
  [Role.CAREER_DEVELOPMENT_OFFICER]:    "DEPARTMENT_HEAD",
  [Role.REGIONAL_HUB_LEAD]:            "DEPARTMENT_HEAD",
  [Role.SAFEGUARDING]:                  "EXECUTIVE",
  [Role.M_AND_E]:                       "DEPARTMENT_HEAD",
  [Role.MARKETING_COMMS_MANAGER]:       "DEPARTMENT_HEAD",
  [Role.BUSINESS_DEVELOPMENT_MANAGER]:  "DEPARTMENT_HEAD",
  [Role.BUSINESS_DEVELOPMENT_ASSOCIATE]: "INSTRUCTOR",
  [Role.HR_OFFICER]:                    "DEPARTMENT_HEAD",
  [Role.FINANCE_ADMIN_OFFICER]:         "DEPARTMENT_HEAD",
  [Role.HEAD_OF_OPERATIONS]:            "EXECUTIVE",
  [Role.ADMIN]:                         "EXECUTIVE",
  [Role.STUDENT]:                       "INSTRUCTOR",
  [Role.PARTNER]:                       "DEPARTMENT_HEAD",
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
