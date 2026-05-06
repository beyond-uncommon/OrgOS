import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser } from "@/modules/youth-coding/queries";
import { MyStudentsClient } from "@/modules/youth-coding/components/MyStudentsClient";

export default async function MyStudentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");
  const students = await getStudentsForUser(user.id);
  return (
    <MyStudentsClient
      user={{ id: user.id, name: user.name, role: user.role }}
      students={students}
    />
  );
}
