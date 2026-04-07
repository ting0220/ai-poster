"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Download, Maximize } from "lucide-react";
import PosterCanvasStatic, { type RenderPosterElement } from "@/app/_components/poster/PosterCanvasStatic";
import ImageCropper from "@/app/templates/_components/ImageCropper";

type TemplateRenderData = {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string | null;
  elements: RenderPosterElement[];
};

function isEmptyImageSrc(src: string | undefined | null) {
  const s = (src ?? "").trim();
  return !s || s === "/file.svg";
}

type CropState = {
  variableKey: string;
  imageUrl: string;
  targetWidth: number;
  targetHeight: number;
  referenceWidth: number;
  referenceHeight: number;
} | null;

export default function GenerateTemplateClient({ template }: { template: TemplateRenderData }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cropState, setCropState] = useState<CropState>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);

  const elementByKey = useMemo(() => {
    const map = new Map<string, RenderPosterElement>();
    for (const el of template.elements) {
      map.set(el.variableKey, el);
    }
    return map;
  }, [template.elements]);

  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const el of template.elements) {
      if (el.type === "image") initial[el.variableKey] = el.src ?? "";
      else initial[el.variableKey] = el.defaultText ?? "";
    }
    return initial;
  });

  const keys = Array.from(elementByKey.keys());

  // 自动计算适应预览区的缩放比例
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const computeFitScale = () => {
      const rect = container.getBoundingClientRect();
      // 预览区宽度 420px - padding 12*2 - border 1*2 = 394px 可用
      const availW = rect.width - 30;
      const availH = rect.height - 60;
      const s = Math.min(1, availW / template.canvasWidth, availH / template.canvasHeight);
      setFitScale(Math.max(0.1, Math.round(s * 100) / 100));
    };

    computeFitScale();
    const observer = new ResizeObserver(computeFitScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [template.canvasWidth, template.canvasHeight]);

  // 画布尺寸变化时自动适配
  useEffect(() => {
    setScale(fitScale);
  }, [fitScale]);

  // 鼠标滚轮缩放（以左上角为中心点）
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale((s) => Math.max(0.1, Math.min(3, Math.round((s + delta) * 100) / 100)));
      }
    },
    [],
  );

  const handleFitScreen = useCallback(() => {
    setScale(fitScale);
  }, [fitScale]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  const uploadBlob = async (blob: Blob, variableKey: string) => {
    const fd = new FormData();
    fd.append("file", blob, "cropped-image.jpg");
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) { alert("上传失败"); return; }
    const data = (await res.json()) as { url: string };
    setVariables((prev) => ({ ...prev, [variableKey]: data.url }));
  };

  const uploadOriginal = async (blob: Blob): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", blob, "original-image.jpg");
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) { alert("上传失败"); return null; }
    const data = (await res.json()) as { url: string };
    return data.url;
  };

  const handleImageUpload = useCallback(
    async (file: File, variableKey: string) => {
      const blob = file as unknown as Blob;
      const url = await uploadOriginal(blob);
      if (!url) return;

      const el = elementByKey.get(variableKey);
      if (!el || el.type !== "image") return;

      const otherEl = template.elements.find((e) => e.variableKey !== variableKey && e.type === "image");
      const refW = otherEl ? otherEl.width : template.canvasWidth;
      const refH = otherEl ? otherEl.height : template.canvasHeight;

      setCropState({
        variableKey,
        imageUrl: url,
        targetWidth: el.width,
        targetHeight: el.height,
        referenceWidth: refW,
        referenceHeight: refH,
      });
    },
    [elementByKey, template.elements]
  );

  const handleCropConfirm = useCallback(
    async (blob: Blob) => {
      if (!cropState) return;
      await uploadBlob(blob, cropState.variableKey);
      setCropState(null);
    },
    [cropState]
  );

  const handleCropCancel = useCallback(() => {
    setCropState(null);
  }, []);

  const downloadPoster = async () => {
    setIsGenerating(true);
    try {
      const dpr = 2;
      const canvas = document.createElement("canvas");
      canvas.width = template.canvasWidth * dpr;
      canvas.height = template.canvasHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) { alert("无法创建画布上下文"); return; }
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, template.canvasWidth, template.canvasHeight);

      if (template.backgroundImage && !isEmptyImageSrc(template.backgroundImage)) {
        try {
          const bgImg = await loadImage(template.backgroundImage);
          ctx.drawImage(bgImg, 0, 0, template.canvasWidth, template.canvasHeight);
        } catch { /* ignore */ }
      }

      const sortedElements = template.elements.slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

      for (const el of sortedElements) {
        if (el.type === "image") {
          const src = variables[el.variableKey] ?? el.src ?? "";
          if (src && !isEmptyImageSrc(src)) {
            try {
              const img = await loadImage(src);
              ctx.drawImage(img, el.x, el.y, el.width, el.height);
            } catch { /* ignore */ }
          }
        } else {
          const text = variables[el.variableKey] ?? el.defaultText ?? "";
          const fontSize = el.fontSize ?? 32;
          const color = el.color ?? "#111827";
          const maxLines = el.maxLines ?? 2;
          const textAlign = el.textAlign ?? "left";
          const verticalAlign = el.verticalAlign ?? "top";

          ctx.save();
          ctx.font = `${fontSize}px system-ui, sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = textAlign;

          const words = text.split("");
          const lineHeight = fontSize * 1.15;
          const maxWidth = el.width;
          let line = "";
          const lines: string[] = [];

          for (const char of words) {
            const testLine = line + char;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
              lines.push(line);
              line = char;
            } else {
              line = testLine;
            }
          }
          if (line) lines.push(line);
          if (lines.length > maxLines) lines.length = maxLines;

          const totalHeight = lines.length * lineHeight;
          let startY: number;
          if (verticalAlign === "bottom") {
            startY = el.y + el.height - totalHeight + fontSize;
          } else if (verticalAlign === "center") {
            startY = el.y + (el.height - totalHeight) / 2 + fontSize;
          } else {
            startY = el.y + fontSize;
          }

          let baseX: number;
          if (textAlign === "center") {
            baseX = el.x + el.width / 2;
          } else if (textAlign === "right") {
            baseX = el.x + el.width;
          } else {
            baseX = el.x;
          }
          for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], baseX, startY + i * lineHeight);
          ctx.restore();
        }
      }

      const link = document.createElement("a");
      link.download = `${template.name}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
      alert("生成图片失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* 顶部标题 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-900">生成海报</div>
            <div className="mt-1 text-sm text-zinc-500">{template.name}</div>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {/* 左侧：最终预览 */}
          <div className="w-[420px] shrink-0">
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-700">最终生成</div>
                <button
                  type="button"
                  onClick={downloadPoster}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isGenerating ? "生成中..." : "保存图片"}
                </button>
              </div>
              <div ref={previewContainerRef} className="overflow-auto rounded-xl border border-zinc-200" style={{ minHeight: 300 }} onWheel={handleWheel}>
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    flexShrink: 0,
                  }}
                >
                  <PosterCanvasStatic
                    canvasSize={{ w: template.canvasWidth, h: template.canvasHeight }}
                    elements={template.elements}
                    values={variables}
                    backgroundImage={template.backgroundImage}
                  />
                </div>
              </div>
              {/* 缩放控件 */}
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 tabular-nums">
                  {Math.round(scale * 100)}%
                </div>
                <button type="button" onClick={handleFitScreen} className="flex h-7 items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-500 hover:bg-zinc-50" title="适应屏幕">
                  <Maximize className="h-3.5 w-3.5" />
                  适应
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：元素信息输入 */}
          <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">元素信息输入</div>
            <div className="mt-1 text-xs text-zinc-400">按变量名填充图片或文字；图片显示方式沿用模板中的设置</div>

            <div className="mt-4 space-y-4">
              {keys.map((key) => {
                const el = elementByKey.get(key)!;

                if (el.type === "text") {
                  return (
                    <div key={key} className="rounded-xl border border-zinc-200 bg-white/80 p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-28 shrink-0 pt-2 text-sm font-medium text-zinc-700">{key}</div>
                        <div className="min-w-0 flex-1">
                          <textarea
                            className="h-24 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                            value={variables[key] ?? ""}
                            onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`请输入${key}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                const url = variables[key] ?? "";
                const isCropping = !!(cropState && cropState.variableKey === key);
                const previewUrl = isCropping ? cropState.imageUrl : url;

                return (
                  <div key={key} className="rounded-xl border border-zinc-200 bg-white/80 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-zinc-900">{key}</div>
                      <div className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">
                        建议 {el.width}×{el.height}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {/* 图片预览区域 */}
                      <div
                        className="relative shrink-0 overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 cursor-pointer"
                        style={{
                          width: el.width >= el.height
                            ? Math.min(120, el.width)
                            : Math.min(120, el.width / el.height * 120),
                          height: el.height > el.width
                            ? Math.min(120, el.height)
                            : Math.min(120, el.height / el.width * 120),
                        }}
                        onClick={() => {
                          if (isCropping) return;
                          const input = document.getElementById(`upload-${key}`) as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        {isEmptyImageSrc(previewUrl) ? (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                            <ImageIcon className="h-8 w-8 text-zinc-300" />
                            <span className="text-xs text-zinc-400">上传图片</span>
                          </div>
                        ) : (
                          <>
                            <img className="h-full w-full object-contain" alt={key} src={previewUrl} />
                            {isCropping && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <span className="text-xs font-medium text-white">裁剪中</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
                          type="text"
                          value={isCropping ? cropState.imageUrl : url}
                          onChange={(e) => !isCropping && setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="或输入图片 URL"
                          readOnly={isCropping}
                        />

                        <div className="mt-3 flex items-center gap-2">
                          <input
                            id={`upload-${key}`}
                            className="hidden"
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              await handleImageUpload(file, key);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`upload-${key}`) as HTMLInputElement;
                              input?.click();
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            本地上传
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 裁剪器：图片预览下方展开 */}
                    {isCropping && (
                      <div className="mt-4">
                        <ImageCropper
                          imageUrl={cropState.imageUrl}
                          targetWidth={cropState.targetWidth}
                          targetHeight={cropState.targetHeight}
                          referenceWidth={cropState.referenceWidth}
                          referenceHeight={cropState.referenceHeight}
                          onConfirm={(blob) => {
                            handleCropConfirm(blob);
                            const input = document.getElementById(`upload-${key}`) as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                          onCancel={() => {
                            handleCropCancel();
                            const input = document.getElementById(`upload-${key}`) as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
