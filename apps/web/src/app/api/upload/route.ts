import { NextResponse } from "next/server";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth/session";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF allowed" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    const ext = file.type.split("/")[1] ?? "jpg";
    const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Blob storage not configured — set BLOB_READ_WRITE_TOKEN env var" },
        { status: 500 },
      );
    }

    const { url } = await put(`student-reports/${name}`, file, { access: "public" });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
