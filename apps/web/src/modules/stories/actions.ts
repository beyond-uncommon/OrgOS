"use server";

import { requireSession } from "@/lib/auth/requireSession";
import { prisma } from "@orgos/db";
import { z } from "zod";

const storySchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1),
  authorName: z.string().min(1).max(100),
  authorRole: z.string().max(100).optional(),
  studentAge: z.string().max(20).optional(),
  studentProgram: z.string().max(100).optional(),
  heroImage: z.string().url().optional().or(z.literal("")),
  tags: z.string().optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  departmentId: z.string().optional(),
});

export type StoryFormData = z.infer<typeof storySchema>;

export async function createStory(formData: StoryFormData) {
  const sessionUser = await requireSession();
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "HUB_LEAD") {
    throw new Error("Unauthorized");
  }

  const parsed = storySchema.safeParse(formData);
  if (!parsed.success) {
    const errMsg = parsed.error.errors[0]?.message ?? "Validation failed";
    throw new Error(errMsg);
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return prisma.story.create({
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || "",
      body: parsed.data.body,
      authorName: parsed.data.authorName,
      authorRole: parsed.data.authorRole || "",
      studentAge: parsed.data.studentAge ? Number(parsed.data.studentAge) : null,
      studentProgram: parsed.data.studentProgram ?? null,
      heroImage: parsed.data.heroImage || null,
      tags,
      published: parsed.data.published,
      featured: parsed.data.featured,
      departmentId: parsed.data.departmentId ?? null,
    },
  });
}

export async function updateStory(id: string, formData: StoryFormData) {
  const sessionUser = await requireSession();
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "HUB_LEAD") {
    throw new Error("Unauthorized");
  }

  const parsed = storySchema.safeParse(formData);
  if (!parsed.success) {
    const errMsg = parsed.error.errors[0]?.message ?? "Validation failed";
    throw new Error(errMsg);
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return prisma.story.update({
    where: { id },
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || "",
      body: parsed.data.body,
      authorName: parsed.data.authorName,
      authorRole: parsed.data.authorRole || "",
      studentAge: parsed.data.studentAge ? Number(parsed.data.studentAge) : null,
      studentProgram: parsed.data.studentProgram ?? null,
      heroImage: parsed.data.heroImage || null,
      tags,
      published: parsed.data.published,
      featured: parsed.data.featured,
    },
  });
}

export async function publishStory(id: string, published: boolean) {
  const sessionUser = await requireSession();
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "HUB_LEAD") {
    throw new Error("Unauthorized");
  }

  return prisma.story.update({
    where: { id },
    data: { published },
  });
}

export async function toggleFeatured(id: string, featured: boolean) {
  const sessionUser = await requireSession();
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "HUB_LEAD") {
    throw new Error("Unauthorized");
  }

  return prisma.story.update({
    where: { id },
    data: { featured },
  });
}

export async function deleteStory(id: string) {
  const sessionUser = await requireSession();
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "HUB_LEAD") {
    throw new Error("Unauthorized");
  }

  return prisma.story.delete({ where: { id } });
}