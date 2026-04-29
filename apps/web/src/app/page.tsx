import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { redirectByRole } from "@/lib/auth/redirect-by-role";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirectByRole(user.role, user.departmentId, user.id);
}
