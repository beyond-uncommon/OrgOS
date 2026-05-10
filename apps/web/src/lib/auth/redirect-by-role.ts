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
    case "YOUTH_CODING_MANAGER":
    case "TEACHER_TRAINING_COORDINATOR":
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
