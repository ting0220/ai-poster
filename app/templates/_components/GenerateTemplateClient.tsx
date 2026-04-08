"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Image as ImageIcon, Download } from "lucide-react";
import PosterCanvasStatic, { type RenderPosterElement } from "@/app/_components/poster/PosterCanvasStatic";
import ImageCropper from "@/app/templates/_components/ImageCropper";
import { useFonts } from "@/app/_components/poster/useFonts";

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
  /** 绑定到预览里已绘制的 1:1 画布根节点（勿用离屏节点，否则浏览器不绘制会得到全白图） */
  const previewCaptureRef = useRef<HTMLDivElement | null>(null);

  // 计算预览区宽度：根据画布比例和可用空间，确保不纵向滚动
  const [previewWidth, setPreviewWidth] = useState(240);
  useEffect(() => {
    const updatePreviewWidth = () => {
      // 顶部区域高度 ≈ 标题(约50px) + 上下padding(48px) + 间距(24px)
      const headerHeight = 122;
      // 预览容器高度 = 视口高度 - 顶部区域 - 底部预留
      const maxPreviewHeight = window.innerHeight - headerHeight - 24;
      // 画布比例
      const canvasRatio = template.canvasHeight / template.canvasWidth;
      // 计算预览宽度（预览区高度固定，计算宽度）
      const calculatedWidth = Math.floor(maxPreviewHeight / canvasRatio);
      // 限制最大宽度，保留一定空间给输入区
      const maxWidth = Math.floor(window.innerWidth * 0.5); // 最多占视口50%
      const minWidth = 200; // 最小宽度
      setPreviewWidth(Math.max(minWidth, Math.min(calculatedWidth, maxWidth)));
    };
    updatePreviewWidth();
    window.addEventListener("resize", updatePreviewWidth);
    return () => window.removeEventListener("resize", updatePreviewWidth);
  }, [template.canvasWidth, template.canvasHeight]);

  // 加载自定义字体（让自定义字体在生成页也能正确渲染）
  useFonts();

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
      const node = previewCaptureRef.current;
      if (!node) {
        alert("导出未就绪，请稍后重试");
        return;
      }
      await document.fonts.ready;
      // 等待画布内图片解码，避免截到空白
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res, rej) => {
                  img.onload = () => res();
                  img.onerror = () => res();
                }),
        ),
      );
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        width: template.canvasWidth,
        height: template.canvasHeight,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${template.name}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("生成图片失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* 顶部标题 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-900">生成海报</div>
            <div className="mt-1 text-sm text-zinc-500">{template.name}</div>
          </div>
        </div>

        {/* 方案一：简单响应式布局 - 小屏幕纵向排列，大屏幕横向排列 */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* 左侧：预览区域 - 小屏幕全宽自适应，大屏幕固定宽度 */}
          <div className="md:shrink-0" style={{ width: `min(100%, ${previewWidth}px)` }}>
            <div
              suppressHydrationWarning
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              style={{ height: (template.canvasHeight / template.canvasWidth) * previewWidth + 52 }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-2">
                <div className="text-xs font-semibold text-zinc-700">最终生成</div>
                <button
                  type="button"
                  onClick={downloadPoster}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-black px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Download className="h-3 w-3" />
                  {isGenerating ? "生成中..." : "保存图片"}
                </button>
              </div>
              {/* 预览画布：居中显示，保持完整比例 */}
              <div
                suppressHydrationWarning
                className="flex flex-1 items-center justify-center overflow-hidden bg-zinc-100/80 p-3"
              >
                <div
                  suppressHydrationWarning
                  className="relative shrink-0"
                  style={{
                    width: previewWidth,
                    height: (template.canvasHeight / template.canvasWidth) * previewWidth,
                  }}
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{
                      width: template.canvasWidth,
                      height: template.canvasHeight,
                      transform: `scale(${previewWidth / template.canvasWidth})`,
                    }}
                  >
                    <div
                      ref={previewCaptureRef}
                      className="inline-block"
                      style={{
                        width: template.canvasWidth,
                        height: template.canvasHeight,
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
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：元素信息输入 - 小屏幕全宽，大屏幕自适应剩余空间 */}
          <div className="flex-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:min-w-0">
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
