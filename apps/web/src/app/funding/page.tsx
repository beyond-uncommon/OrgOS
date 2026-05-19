import { prisma } from "@orgos/db";
import { FundingClient } from "@/modules/funding/FundingClient";
import { requireAccess } from "@/lib/auth/requireAccess";

export const dynamic = "force-dynamic";

export default async function FundingPage() {
  const { user } = await requireAccess([
    "COUNTRY_DIRECTOR", "ADMIN", "FINANCE_ADMIN_OFFICER",
    "BUSINESS_DEVELOPMENT_MANAGER", "BUSINESS_DEVELOPMENT_ASSOCIATE",
  ]);

  const [records, programs] = await Promise.all([
    prisma.fundingRecord.findMany({
      orderBy: { receivedAt: "desc" },
      include: { program: { select: { id: true, name: true } } },
    }),
    prisma.department.findMany({
      where: { parentDepartmentId: { not: null }, children: { some: {} } },
      select: { id: true, name: true },
    }),
  ]);

  const totalFunding = records.reduce((s, r) => s + r.amount, 0);

  return (
    <FundingClient
      records={records.map(r => ({
        id: r.id,
        amount: r.amount,
        source: r.source,
        description: r.description,
        receivedAt: r.receivedAt.toISOString().slice(0, 10),
        program: r.program ?? null,
        createdAt: r.createdAt,
      }))}
      programs={programs}
      totalFunding={totalFunding}
      userName={user.name}
      userRole={user.role}
    />
  );
}
