import { prisma } from "@/app/_lib/prisma";
import { isAuthenticated } from "@/app/_lib/auth";
import PasswordGate from "@/app/_components/PasswordGate";
import TemplateEditorClientWrapper from "@/app/templates/_components/TemplateEditorClientWrapper";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordGate redirectTo={`/templates/${id}/edit`} />;
  }

  const template = await prisma.template.findUnique({
    where: { id },
    include: { elements: true },
  });

  if (!template) return <div className="p-6 text-sm text-zinc-500">模板不存在</div>;

  const initialElements = template.elements.map((e) => {
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
        src: e.src ?? "",
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
      text: e.defaultText ?? "",
      fontSize: e.fontSize ?? 32,
      color: e.color ?? "#111827",
      fontFamily: e.fontFamily ?? undefined,
      textAlign: (e.textAlign as "left" | "center" | "right" | undefined) ?? "left",
      verticalAlign: (e.verticalAlign as "top" | "center" | "bottom" | undefined) ?? "top",
    };
  });

  return (
    <TemplateEditorClientWrapper
      templateId={template.id}
      initialName={template.name}
      initialCanvasSize={{ w: template.canvasWidth, h: template.canvasHeight }}
      initialElements={initialElements}
      initialBackgroundImage={template.backgroundImage}
    />
  );
}
