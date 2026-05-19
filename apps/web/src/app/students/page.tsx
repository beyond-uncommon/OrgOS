import { getUnifiedStudents, getStudentStats, type ProgramType } from "@/modules/students/queries";
import { StudentsClient } from "@/modules/students/StudentsClient";
import { requireAccess } from "@/lib/auth/requireAccess";

export default async function StudentsPage() {
  const { user, departmentIds } = await requireAccess([
    "PROGRAM_MANAGER",
    "BOOTCAMP_MANAGER",
    "YOUTH_CODING_MANAGER",
    "COUNTRY_DIRECTOR",
    "ADMIN",
  ]);

  const [students, stats] = await Promise.all([
    getUnifiedStudents(departmentIds),
    getStudentStats(departmentIds),
  ]);

  const programs = ["youth-coding", "bootcamp", "teacher-training", "outreach"] as const;
  const statuses = ["ACTIVE", "DROPPED", "GRADUATED", "PAUSED"];

  return (
    <StudentsClient
      user={{ name: user.name, role: user.role }}
      students={students.map(s => ({
        ...s,
        createdAt: s.createdAt,
        firstEnrollmentDate: s.firstEnrollmentDate,
        lastActivityDate: s.lastActivityDate,
      }))}
      stats={stats}
      programs={programs}
      statuses={statuses}
    />
  );
}