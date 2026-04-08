"use client";

import dynamic from "next/dynamic";

const TemplateEditorClient = dynamic(
  () => import("@/app/templates/_components/TemplateEditorClient"),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center text-zinc-500">加载中...</div> }
);

export default function TemplateEditorClientWrapper(props: {
  templateId: string;
  initialName: string;
  initialCanvasSize: { w: number; h: number };
  initialElements: import("@/app/_components/poster/posterTypes").PosterElement[];
  initialBackgroundImage?: string | null;
}) {
  return <TemplateEditorClient {...props} />;
}
