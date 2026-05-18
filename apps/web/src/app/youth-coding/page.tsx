import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  getYCMasterList,
  getYCManagerMetrics,
  getYCHubs,
  getYCStudentReports,
  getYCInstructorEntries,
  getYCWeeklyReports,
  getYCSessionsForManager,
} from "@/modules/youth-coding/queries";
import { YCMasterClient } from "@/modules/youth-coding/components/YCMasterClient";

const HUB_LEAD_AND_ABOVE = ["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "ADMIN", "YOUTH_CODING_MANAGER"];

export default async function YCMasterDatabasePage() {
  const user = await getSessionUser();
  if (!user || !HUB_LEAD_AND_ABOVE.includes(user.role)) redirect("/login");
  const isHubScoped = user.role === "HUB_LEAD";
  const scopedDeptId = isHubScoped ? user.departmentId : undefined;
  const [students, metrics, hubs, studentReports, instructorEntries, weeklyReports, sessions] = await Promise.all([
    getYCMasterList(scopedDeptId),
    getYCManagerMetrics(scopedDeptId),
    isHubScoped ? Promise.resolve([]) : getYCHubs(),
    getYCStudentReports(scopedDeptId, 7),
    getYCInstructorEntries(scopedDeptId, 7),
    getYCWeeklyReports(scopedDeptId),
    getYCSessionsForManager(scopedDeptId),
  ]);
  return (
    <YCMasterClient
      user={{ name: user.name, role: user.role }}
      students={students}
      metrics={metrics}
      hubs={hubs}
      studentReports={studentReports.map(r => ({ ...r, date: new Date(r.date) }))}
      instructorEntries={instructorEntries.map(e => ({ ...e, date: new Date(e.date) }))}
      weeklyReports={weeklyReports.map(w => ({ ...w, weekStart: new Date(w.weekStart), weekEnd: new Date(w.weekEnd) }))}
      sessions={sessions.map(s => ({ ...s, date: new Date(s.date) }))}
    />
  );
}
