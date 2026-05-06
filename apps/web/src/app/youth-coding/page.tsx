import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getYCMasterList, getYCManagerMetrics } from "@/modules/youth-coding/queries";
import { YCMasterClient } from "@/modules/youth-coding/components/YCMasterClient";

const HUB_LEAD_AND_ABOVE = ["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "ADMIN", "YOUTH_CODING_MANAGER"];

export default async function YCMasterDatabasePage() {
  const user = await getSessionUser();
  if (!user || !HUB_LEAD_AND_ABOVE.includes(user.role)) redirect("/login");
  const isHubScoped = user.role === "HUB_LEAD";
  const scopedDeptId = isHubScoped ? user.departmentId : undefined;
  const [students, metrics] = await Promise.all([
    getYCMasterList(scopedDeptId),
    getYCManagerMetrics(scopedDeptId),
  ]);
  return <YCMasterClient user={{ name: user.name, role: user.role }} students={students} metrics={metrics} />;
}
