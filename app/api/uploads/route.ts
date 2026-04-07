import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  type UploadFile = { arrayBuffer: () => Promise<ArrayBuffer>; type?: string; name?: string };
  const f = file as unknown as UploadFile | null;
  if (!f || typeof f.arrayBuffer !== "function") {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const contentType = typeof f.type === "string" ? f.type : "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  }

  const arrayBuffer = await f.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const original = typeof f.name === "string" ? f.name : "upload";
  const filename = `${Date.now()}-${safeFileName(original)}`;
  const fullPath = path.join(uploadDir, filename);
  fs.writeFileSync(fullPath, buffer);

  const url = `/uploads/${filename}`;
  return NextResponse.json({ url });
}

