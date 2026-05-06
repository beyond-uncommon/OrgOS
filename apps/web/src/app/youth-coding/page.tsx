import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getYCMasterList } from "@/modules/youth-coding/queries";
import { YCMasterClient } from "@/modules/youth-coding/components/YCMasterClient";

const HUB_LEAD_AND_ABOVE = ["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "ADMIN"];

export default async function YCMasterDatabasePage() {
  const user = await getSessionUser();
  if (!user || !HUB_LEAD_AND_ABOVE.includes(user.role)) redirect("/login");
  const isHubScoped = user.role === "HUB_LEAD";
  const students = await getYCMasterList(isHubScoped ? user.departmentId : undefined);
  return <YCMasterClient user={{ name: user.name, role: user.role }} students={students} />;
}
