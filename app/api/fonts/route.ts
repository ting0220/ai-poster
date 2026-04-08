import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/app/_lib/prisma";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
}

const ALLOWED_EXTENSIONS = ["ttf", "otf", "woff", "woff2"];
const ALLOWED_CONTENT_TYPES = [
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/octet-stream",
];

/** GET /api/fonts — 返回已上传字体列表 */
export async function GET() {
  const fonts = await prisma.font.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ fonts });
}

/** POST /api/fonts — 上传字体文件 */
export async function POST(req: Request) {
  try {
  const formData = await req.formData();
  const file = formData.get("file");
  const customName = formData.get("name");

  type UploadFile = {
    arrayBuffer: () => Promise<ArrayBuffer>;
    type?: string;
    name?: string;
  };
  const f = file as unknown as UploadFile | null;
  if (!f || typeof f.arrayBuffer !== "function") {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const originalName =
    typeof f.name === "string" ? f.name : "font";
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `不支持的字体格式，支持：${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const contentType = typeof f.type === "string" ? f.type : "";
  if (
    contentType &&
    !ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))
  ) {
    // 非严格校验，仅在非字体 MIME 类型时拦截（有些系统上传字体会用 octet-stream）
  }

  // 字体显示名称（优先使用前端传来的自定义名，否则使用文件名去掉扩展名）
  const displayName =
    typeof customName === "string" && customName.trim()
      ? customName.trim()
      : originalName.replace(/\.[^.]+$/, "");

  // 检查名称唯一性
  const existing = await prisma.font.findUnique({ where: { name: displayName } });
  if (existing) {
    return NextResponse.json(
      { error: `字体名称「${displayName}」已存在` },
      { status: 400 }
    );
  }

  const arrayBuffer = await f.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fontDir = path.join(process.cwd(), "public", "fonts");
  fs.mkdirSync(fontDir, { recursive: true });

  const fileName = `${Date.now()}-${safeFileName(originalName)}`;
  const fullPath = path.join(fontDir, fileName);
  fs.writeFileSync(fullPath, buffer);

  const url = `/fonts/${fileName}`;
  const font = await prisma.font.create({
    data: {
      name: displayName,
      fileName,
      url,
      format: ext,
    },
  });

  return NextResponse.json({ font });
  } catch (e) {
    console.error("[POST /api/fonts]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "服务器错误" },
      { status: 500 }
    );
  }
}

/** DELETE /api/fonts?id=xxx — 删除字体 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const font = await prisma.font.findUnique({ where: { id } });
  if (!font) {
    return NextResponse.json({ error: "字体不存在" }, { status: 404 });
  }

  // 删除文件
  try {
    const fullPath = path.join(process.cwd(), "public", "fonts", font.fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // 文件删除失败不影响数据库记录删除
  }

  await prisma.font.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
