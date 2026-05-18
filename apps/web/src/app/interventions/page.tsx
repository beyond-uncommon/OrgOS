import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma } from "@orgos/db";
import { InterventionsClient } from "@/modules/interventions/components/InterventionsClient";

export default async function InterventionsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { role, departmentId, id: userId } = sessionUser;

  if (role === "INSTRUCTOR") {
    redirect(`/departments/${departmentId}/instructors/${userId}`);
  }

  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  const interventions = await prisma.intervention.findMany({
    where: {
      status: { not: "RESOLVED" },
      ...(accessibleIds.length > 0
        ? { alert: { entry: { departmentId: { in: accessibleIds } } } }
        : role === "STUDENT"
        ? { id: "impossible-id" }
        : {}),
    },
    include: {
      alert: true,
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <InterventionsClient
      interventions={interventions as never[]}
      userRole={role}
      userId={userId}
      userDepartmentId={departmentId}
    />
  );
}