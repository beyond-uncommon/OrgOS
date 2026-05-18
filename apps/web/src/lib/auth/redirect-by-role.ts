import { redirect } from "next/navigation";

const ROLE_ROUTE: Record<string, string> = {
  HEAD_OF_OPERATIONS: "/roles/head-of-operations",
  HEAD_OF_DESIGN: "/roles/head-of-design",
  HEAD_OF_DEVELOPMENT: "/roles/head-of-development",
  SAFEGUARDING: "/roles/safeguarding",
  M_AND_E: "/roles/me",
  MARKETING_COMMS_MANAGER: "/roles/marketing",
  BUSINESS_DEVELOPMENT_MANAGER: "/roles/business-dev",
  BUSINESS_DEVELOPMENT_ASSOCIATE: "/roles/business-dev-associate",
  CAREER_DEVELOPMENT_OFFICER: "/roles/career-dev",
  REGIONAL_HUB_LEAD: "/roles/regional-hub",
  HR_OFFICER: "/roles/hr",
  FINANCE_ADMIN_OFFICER: "/roles/finance",
};

export function redirectByRole(
  role: string,
  departmentId: string | null,
  userId: string,
): never {
  const route = ROLE_ROUTE[role];
  if (route) redirect(route);

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
      redirect("/coming-soon");
  }
}