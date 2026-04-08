import React from "react";
import dynamic from "next/dynamic";
import { prisma } from "@/app/_lib/prisma";

const GenerateTemplateClient = dynamic(
  () => import("@/app/templates/_components/GenerateTemplateClient")
);

export default async function GenerateTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.template.findUnique({
    where: { id },
    include: { elements: true },
  });

  if (!template) return <div className="p-6 text-sm text-zinc-500">模板不存在</div>;

  const elements = template.elements.map((e) => {
    if (e.type === "IMAGE") {
      return {
        id: e.id,
        type: "image" as const,
        x: e.x,
        y: e.y,
        width: e.width,
        height: e.height,
        zIndex: e.zIndex,
        variableKey: e.variableKey,
        src: e.src,
      };
    }

    return {
      id: e.id,
      type: "text" as const,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      zIndex: e.zIndex,
      variableKey: e.variableKey,
      defaultText: e.defaultText,
      fontSize: e.fontSize,
      color: e.color,
      fontFamily: e.fontFamily ?? undefined,
      textAlign: e.textAlign as "left" | "center" | "right" | undefined ?? undefined,
      verticalAlign: e.verticalAlign as "top" | "center" | "bottom" | undefined ?? undefined,
    };
  });

  return (
    <GenerateTemplateClient
      template={{
        id: template.id,
        name: template.name,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
        backgroundImage: template.backgroundImage,
        elements,
      }}
    />
  );
}

