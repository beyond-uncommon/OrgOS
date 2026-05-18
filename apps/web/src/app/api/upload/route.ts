import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const ext = file.type.split("/")[1] ?? "jpg";
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "student-reports");
  const bytes = new Uint8Array(await file.arrayBuffer());

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);

  return NextResponse.json({ url: `/uploads/student-reports/${name}` });
}
