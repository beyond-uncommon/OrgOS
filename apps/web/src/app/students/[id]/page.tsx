import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentById, updateStudentStatus, addStudentNote, type StudentDetail } from "@/modules/students/queries";
import { StudentDetailClient } from "@/modules/students/StudentDetailClient";
import { prisma } from "@orgos/db";

const ALLOWED_ROLES = [
  "PROGRAM_MANAGER",
  "BOOTCAMP_MANAGER",
  "YOUTH_CODING_MANAGER",
  "COUNTRY_DIRECTOR",
  "ADMIN",
];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) redirect("/login");

  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) {
    redirect("/students");
  }

  async function handleStatusChange(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    await updateStudentStatus(id, newStatus);
  }

  async function handleAddNote(formData: FormData) {
    "use server";
    const note = formData.get("note") as string;
    if (note.trim()) {
      await addStudentNote(id, note);
    }
  }

  return (
    <StudentDetailClient
      user={{ name: user.name, role: user.role }}
      student={{
        ...student,
        createdAt: student.createdAt,
        firstEnrollmentDate: student.firstEnrollmentDate,
        lastActivityDate: student.lastActivityDate,
        allReports: student.allReports.map(r => ({ ...r, date: r.date })),
        allSessions: student.allSessions.map(s => ({ ...s, date: s.date })),
        dailyEntries: student.dailyEntries.map(e => ({ ...e, date: e.date })),
      }}
      handleStatusChange={handleStatusChange}
      handleAddNote={handleAddNote}
    />
  );
}