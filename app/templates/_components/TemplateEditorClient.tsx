"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PosterBuilder, { type PosterTemplateSnapshot } from "@/app/_components/poster/PosterBuilder";
import type { PosterElement, PosterTextElement } from "@/app/_components/poster/posterTypes";

type TemplateEditorClientProps = {
  templateId?: string;
  initialName?: string;
  initialCanvasSize?: { w: number; h: number };
  initialElements?: PosterElement[];
  initialBackgroundImage?: string | null;
};

export default function TemplateEditorClient({
  templateId,
  initialName,
  initialCanvasSize,
  initialElements,
  initialBackgroundImage,
}: TemplateEditorClientProps) {
  const [templateName, setTemplateName] = useState(initialName ?? "");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialBackgroundImage ?? null);
  const [snapshot, setSnapshot] = useState<PosterTemplateSnapshot | null>(null);

  // 同步初始值
  useEffect(() => {
    setBackgroundImage(initialBackgroundImage ?? null);
    setSnapshot({
      canvasSize: initialCanvasSize ?? { w: 375, h: 750 },
      elements: initialElements ?? [],
      backgroundImage: initialBackgroundImage ?? null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payloadElements = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.elements.map((e) => {
      const textEl = e.type === "text" ? (e as PosterTextElement) : null;
      return {
        type: e.type,
        x: e.x,
        y: e.y,
        width: e.width,
        height: e.height,
        zIndex: e.zIndex,
        variableKey: e.variableKey,
        src: e.type === "image" ? (e as { src: string }).src : null,
        defaultText: textEl ? textEl.text : null,
        fontSize: textEl ? textEl.fontSize : null,
        color: textEl ? textEl.color : null,
        fontFamily: textEl ? (textEl.fontFamily ?? null) : null,
        textAlign: textEl ? textEl.textAlign : null,
        verticalAlign: textEl ? textEl.verticalAlign : null,
      };
    });
  }, [snapshot]);

  const onBackgroundChange = useCallback((url: string | null) => {
    setBackgroundImage(url);
    setSnapshot((prev) => (prev ? { ...prev, backgroundImage: url } : null));
  }, []);

  const validate = () => {
    const name = templateName.trim();
    if (!name) {
      alert("模板名称不能为空");
      return false;
    }
    if (!snapshot) {
      alert("画布数据尚未初始化");
      return false;
    }
    const keys = snapshot.elements.map((e) => (e.variableKey ?? "").trim());
    if (keys.length === 0) {
      alert("请先拖拽至少一个元素");
      return false;
    }
    if (keys.some((k) => !k)) {
      alert("所有元素的 variableKey（元素名称）不能为空");
      return false;
    }
    const unique = new Set(keys);
    if (unique.size !== keys.length) {
      alert("同一模板内 variableKey 不能重复");
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate() || !snapshot) return;

    const body = {
      name: templateName.trim(),
      canvasWidth: snapshot.canvasSize.w,
      canvasHeight: snapshot.canvasSize.h,
      backgroundImage: snapshot.backgroundImage,
      elements: payloadElements,
    };

    const res = await fetch(
      templateId ? `/api/templates/${templateId}` : "/api/templates",
      {
        method: templateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(err?.error ?? "保存失败");
      return;
    }

    alert("保存成功");
  };

  if (!snapshot) return null;

  return (
    <PosterBuilder
      initialCanvasSize={snapshot.canvasSize}
      initialElements={snapshot.elements}
      initialBackgroundImage={backgroundImage}
      onTemplateChange={(s) => setSnapshot(s)}
      onBackgroundChange={onBackgroundChange}
      sidebarHeader={
        <input
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="模板名称"
        />
      }
      sidebarFooter={
        <button
          type="button"
          onClick={onSave}
          className="h-10 w-full rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          保存模板
        </button>
      }
    />
  );
}
