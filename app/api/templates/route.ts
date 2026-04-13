import { NextResponse } from "next/server";
import { prisma } from "../../_lib/prisma";

import type { PosterElementType } from "@/app/generated/prisma/enums";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));
  const orderBy = searchParams.get("orderBy") === "createdAt" ? "createdAt" : "updatedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search")?.trim() ?? "";

  const where = search
    ? { name: { contains: search } }
    : undefined;

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { [orderBy]: order },
      select: {
        id: true,
        name: true,
        canvasWidth: true,
        canvasHeight: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.template.count({ where }),
  ]);

  return NextResponse.json({ templates, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

function normalizeType(type: "image" | "text"): PosterElementType {
  return (type === "image" ? "IMAGE" : "TEXT") as PosterElementType;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name: string;
    canvasWidth: number;
    canvasHeight: number;
    backgroundImage?: string | null;
    elements: Array<{
      type: "image" | "text";
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
      variableKey: string;
      src?: string | null;
      defaultText?: string | null;
      fontSize?: number | null;
      color?: string | null;
      fontFamily?: string | null;
      textAlign?: string | null;
      verticalAlign?: string | null;
    }>;
  };

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "模板名称不能为空" }, { status: 400 });
  }

  const elements = Array.isArray(body.elements) ? body.elements : [];
  const keys = elements.map((e) => (e.variableKey ?? "").trim());
  if (keys.some((k) => !k)) {
    return NextResponse.json({ error: "所有元素的 variableKey 不能为空" }, { status: 400 });
  }
  const unique = new Set(keys);
  if (unique.size !== keys.length) {
    return NextResponse.json({ error: "同一模板内 variableKey 不能重复" }, { status: 400 });
  }

  const created = await prisma.template.create({
    data: {
      name,
      canvasWidth: Number(body.canvasWidth),
      canvasHeight: Number(body.canvasHeight),
      backgroundImage: body.backgroundImage ?? null,
      elements: {
        create: elements.map((e) => ({
          type: normalizeType(e.type),
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          zIndex: e.zIndex,
          variableKey: e.variableKey.trim(),
          src: e.type === "image" ? (e.src ?? null) : null,
          defaultText: e.type === "text" ? (e.defaultText ?? "") : null,
          fontSize: e.type === "text" ? (e.fontSize ?? null) : null,
          color: e.type === "text" ? (e.color ?? null) : null,
          fontFamily: e.type === "text" ? (e.fontFamily ?? null) : null,
          textAlign: e.type === "text" ? (e.textAlign ?? null) : null,
          verticalAlign: e.type === "text" ? (e.verticalAlign ?? null) : null,
        })),
      },
    },
  });

  return NextResponse.json({ templateId: created.id });
}

