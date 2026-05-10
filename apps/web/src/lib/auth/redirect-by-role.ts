import { redirect } from "next/navigation";

export function redirectByRole(
  role: string,
  departmentId: string | null,
  userId: string,
): never {
  switch (role) {
    case "INSTRUCTOR":
      redirect(`/departments/${departmentId}/instructors/${userId}`);
    case "HUB_LEAD":
      redirect(`/departments/${departmentId}`);
    case "BOOTCAMP_MANAGER":
      redirect(`/bootcamps/${departmentId}`);
    case "YOUTH_CODING_MANAGER":
      redirect(`/youth-coding`);
    case "TEACHER_TRAINING_COORDINATOR":
      redirect(`/programs/${departmentId}`);
    case "PROGRAM_MANAGER":
      redirect(`/programs`);
    case "COUNTRY_DIRECTOR":
      redirect(`/country`);
    case "STUDENT":
      redirect(`/student`);
    default:
      redirect(`/coming-soon`);
  }
}
