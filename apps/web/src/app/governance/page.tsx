import { prisma } from "@orgos/db";
import { GovernanceClient } from "@/modules/governance/GovernanceClient";
import { requireAccess } from "@/lib/auth/requireAccess";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  const { user } = await requireAccess(["COUNTRY_DIRECTOR", "ADMIN"]);

  const [policies, departments] = await Promise.all([
    prisma.boardPolicy.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { name: true } },
        setBy: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <GovernanceClient
      policies={policies.map(p => ({
        id: p.id,
        departmentId: p.departmentId,
        automationLevel: p.automationLevel,
        maxAutoRiskThreshold: p.maxAutoRiskThreshold,
        allowedAutoActions: p.allowedAutoActions as string[],
        forbiddenActions: p.forbiddenActions as string[],
        active: p.active,
        effectiveFrom: p.effectiveFrom,
        departmentName: p.department?.name ?? null,
      }))}
      departments={departments}
      userName={user.name}
      userRole={user.role}
    />
  );
}
