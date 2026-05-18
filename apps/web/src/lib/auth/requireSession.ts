import { redirect } from "next/navigation";
import { getSessionUser } from "./session";

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
