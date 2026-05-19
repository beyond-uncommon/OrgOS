"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { prisma } from "@orgos/db";
import { z } from "zod";
import type { ActionResult } from "@orgos/utils";

const AnnouncementPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const AnnouncementScope = z.enum(["HUB", "PROGRAM", "ORG"]);

const createSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  scope: AnnouncementScope,
  priority: AnnouncementPriority.default("NORMAL"),
  pinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  expiresAt: z.string().optional().transform(v => v ? new Date(v) : null),
  departmentId: z.string().optional(),
});

const CAN_CREATE = ["HUB_LEAD", "ADMIN", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR"];

export async function createAnnouncement(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireSession();
  if (!CAN_CREATE.includes(user.role)) {
    return { success: false, error: "You don't have permission to post announcements." };
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const data = parsed.data;

  let departmentId: string | null = null;
  if (data.scope === "HUB") {
    departmentId = user.departmentId ?? null;
  } else if (data.scope === "PROGRAM") {
    departmentId = user.departmentId ?? null;
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      scope: data.scope,
      priority: data.priority,
      pinned: data.pinned,
      tags: data.tags,
      expiresAt: data.expiresAt ?? null,
      departmentId,
      authorId: user.id,
    },
    select: { id: true },
  });

  return { success: true, data: announcement };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult<void>> {
  const user = await requireSession();
  const ann = await prisma.announcement.findUnique({ where: { id }, select: { authorId: true } });
  if (!ann) return { success: false, error: "Announcement not found." };
  if (ann.authorId !== user.id && user.role !== "ADMIN") {
    return { success: false, error: "Permission denied." };
  }
  await prisma.announcement.delete({ where: { id } });
  return { success: true, data: undefined };
}

export async function togglePinAnnouncement(id: string): Promise<ActionResult<void>> {
  const user = await requireSession();
  const ann = await prisma.announcement.findUnique({ where: { id }, select: { authorId: true } });
  if (!ann) return { success: false, error: "Announcement not found." };
  if (ann.authorId !== user.id && user.role !== "ADMIN") {
    return { success: false, error: "Permission denied." };
  }
  await prisma.announcement.update({ where: { id }, data: { pinned: true } });
  return { success: true, data: undefined };
}