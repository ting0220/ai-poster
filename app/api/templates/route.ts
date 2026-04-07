import { NextResponse } from "next/server";
import { prisma } from "../../_lib/prisma";

import type { PosterElementType } from "@/app/generated/prisma/enums";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      canvasWidth: true,
      canvasHeight: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ templates });
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
      maxLines?: number | null;
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
          maxLines: e.type === "text" ? (e.maxLines ?? null) : null,
        })),
      },
    },
  });

  return NextResponse.json({ templateId: created.id });
}

