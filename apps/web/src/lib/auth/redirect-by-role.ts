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
    case "PROGRAM_MANAGER":
      redirect(`/programs/${departmentId}`);
    case "COUNTRY_DIRECTOR":
      redirect(`/country`);
    default:
      redirect(`/coming-soon`);
  }
}
