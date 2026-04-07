"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Type as TypeIcon, GripHorizontal, Upload, X, Layers, Trash2 } from "lucide-react";
import { Rnd } from "react-rnd";
import type {
  PosterElement,
  PosterImageElement,
  PosterTextElement,
} from "./posterTypes";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const SIZE_MIN = 10;
const SIZE_MAX = 2000;

/** 画布与侧栏：无图或历史默认 /file.svg 时用轻量占位，避免大块默认图标显得乱 */
function isEmptyImageSrc(src: string | undefined | null) {
  const s = (src ?? "").trim();
  return !s || s === "/file.svg";
}

function ImageSlotPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div
      className={[
        "flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300/80 bg-zinc-50/80 text-zinc-400",
        compact ? "py-6" : "py-2",
      ].join(" ")}
    >
      <ImageIcon
        className={compact ? "h-6 w-6 shrink-0 opacity-60" : "h-8 w-8 shrink-0 opacity-55"}
        strokeWidth={1.25}
      />
      <span className={compact ? "px-2 text-center text-[10px] font-medium text-zinc-400" : "px-1 text-center text-[11px] font-medium text-zinc-400"}>
        {compact ? "暂无图片" : "图片占位 · 侧栏填 URL"}
      </span>
    </div>
  );
}

function toNumber(input: string, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function applyBounds(next: PosterElement, bounds: { w: number; h: number }): PosterElement {
  const width = clamp(next.width, SIZE_MIN, Math.min(bounds.w, SIZE_MAX));
  const height = clamp(next.height, SIZE_MIN, Math.min(bounds.h, SIZE_MAX));
  const x = clamp(next.x, 0, Math.max(0, bounds.w - width));
  const y = clamp(next.y, 0, Math.max(0, bounds.h - height));
  return { ...next, x, y, width, height };
}

type ElementEditorProps = {
  element: PosterElement;
  onChange: (patch: Partial<PosterElement>) => void;
  onDelete: () => void;
};

export type PosterTemplateSnapshot = {
  canvasSize: { w: number; h: number };
  elements: PosterElement[];
  backgroundImage: string | null;
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-600">{label}</div>
      <input
        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(toNumber(e.target.value, value))}
      />
    </label>
  );
}

function CommitNumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") return setText(String(value));
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return setText(String(value));
    onCommit(n);
  };

  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-600">{label}</div>
      <input
        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-600">{label}</div>
      <div className="flex items-center gap-2">
        <input
          className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex-1">
          <input
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </label>
  );
}

function ElementEditor({ element, onChange, onDelete }: ElementEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
            <GripHorizontal className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-900">属性</div>
            <div className="text-xs text-zinc-500">
              {element.type === "image" ? "图片" : "文本"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
          title="删除元素"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
        <div className="mb-2 text-xs font-medium text-zinc-700">位置与尺寸</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="X" value={element.x} onChange={(next) => onChange({ x: next })} />
          <NumberField label="Y" value={element.y} onChange={(next) => onChange({ y: next })} />
          <CommitNumberField
            label="宽度"
            value={element.width}
            onCommit={(next) => onChange({ width: next })}
          />
          <CommitNumberField
            label="高度"
            value={element.height}
            onCommit={(next) => onChange({ height: next })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
        <div className="mb-2 text-xs font-medium text-zinc-700">元素名称（variableKey）</div>
        <label className="block">
          <div className="mb-1 text-xs text-zinc-600">用于生成页填充</div>
          <input
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
            type="text"
            value={element.variableKey}
            onChange={(e) => onChange({ variableKey: e.target.value })}
            placeholder="例如：title / coverImage / price..."
          />
        </label>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
        <div className="mb-2 text-xs font-medium text-zinc-700">图层顺序（zIndex）</div>
        <CommitNumberField
          label="zIndex"
          value={element.zIndex}
          onCommit={(next) => onChange({ zIndex: next })}
        />
      </div>

      {element.type === "text" ? (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
          <div className="mb-2 text-xs font-medium text-zinc-700">文本内容</div>
          <label className="block">
            <div className="mb-1 text-xs text-zinc-600">文字（不可为空）</div>
            <textarea
              className="h-20 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              value={element.text}
              placeholder="请输入文本内容"
              onChange={(e) => onChange({ text: e.target.value })}
              onBlur={() => {
                if (!element.text.trim()) onChange({ text: "输入文字" });
              }}
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberField
              label="字体大小"
              value={element.fontSize}
              onChange={(next) => onChange({ fontSize: next })}
            />
            <NumberField
              label="最大行数"
              value={element.maxLines}
              onChange={(next) => onChange({ maxLines: next })}
            />
          </div>

          <div className="mt-3">
            <ColorField
              label="字体颜色"
              value={element.color}
              onChange={(next) => onChange({ color: next })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 text-xs text-zinc-600">水平对齐</div>
              <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
                {([
                  { value: "left", label: "左" },
                  { value: "center", label: "中" },
                  { value: "right", label: "右" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ textAlign: value })}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      element.textAlign === value
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-zinc-600">垂直对齐</div>
              <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
                {([
                  { value: "top", label: "上" },
                  { value: "center", label: "中" },
                  { value: "bottom", label: "下" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ verticalAlign: value })}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      element.verticalAlign === value
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {element.type === "image" ? (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-3">
          <div className="text-xs font-medium text-zinc-700">图片预览</div>
          <div className="mt-2 h-28 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {isEmptyImageSrc(element.src) ? (
              <ImageSlotPlaceholder compact />
            ) : (
              <img className="h-full w-full object-contain" alt="poster image" src={element.src} />
            )}
          </div>

          <div className="mt-3">
            <label className="block">
              <div className="mb-1 text-xs text-zinc-600">默认图片 URL（可留空）</div>
              <input
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
                type="text"
                value={element.src}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder="留空为占位，或粘贴图片地址"
              />
            </label>
          </div>

        </div>
      ) : null}
    </div>
  );
}

type PosterBuilderProps = {
  initialCanvasSize?: { w: number; h: number };
  initialElements?: PosterElement[];
  initialBackgroundImage?: string | null;
  onTemplateChange?: (snapshot: PosterTemplateSnapshot) => void;
  /** 渲染在左侧栏「提示」区块下方，例如保存按钮 */
  sidebarFooter?: React.ReactNode;
  /** 模板名称 input，当前值 */
  templateName?: string;
  /** 模板名称 onChange */
  onTemplateNameChange?: (v: string) => void;
  /** 工具栏上方 slot，传入模板名称 input 即可 */
  sidebarHeader?: React.ReactNode;
  /** 背景图变更回调 */
  onBackgroundChange?: (url: string | null) => void;
};

export default function PosterBuilder({
  initialCanvasSize,
  initialElements,
  initialBackgroundImage,
  onTemplateChange,
  sidebarFooter,
  templateName,
  onTemplateNameChange,
  sidebarHeader,
  onBackgroundChange,
}: PosterBuilderProps) {
  const posterRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<PosterElement[]>(initialElements ?? []);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialBackgroundImage ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>(
    initialCanvasSize ?? { w: 375, h: 750 },
  );
  const [scale, setScale] = useState<number>(1);
  const [scaleInput, setScaleInput] = useState<string>("100%");

  // 同步背景图 prop 变化到内部 state
  useEffect(() => {
    setBackgroundImage(initialBackgroundImage ?? null);
  }, [initialBackgroundImage]);

  const updateElement = (id: string, patch: Partial<PosterElement>) => {
    const bounds = { w: canvasSize.w, h: canvasSize.h };
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const merged = { ...el, ...patch } as PosterElement;

        const warnings: string[] = [];
        const kind = el.type === "image" ? "图片" : "文本";
        if (merged.width < SIZE_MIN) warnings.push(`${kind}宽度最小不要小于${SIZE_MIN}`);
        if (merged.width > SIZE_MAX) warnings.push(`${kind}宽度最大不要超出${SIZE_MAX}`);
        if (merged.height < SIZE_MIN) warnings.push(`${kind}高度最小不要小于${SIZE_MIN}`);
        if (merged.height > SIZE_MAX) warnings.push(`${kind}高度最大不要超出${SIZE_MAX}`);
        if (warnings.length) window.alert(warnings.join("\n"));

        merged.width = clamp(merged.width, SIZE_MIN, SIZE_MAX);
        merged.height = clamp(merged.height, SIZE_MIN, SIZE_MAX);

        if (merged.type === "text") {
          merged.maxLines = clamp(Math.round(merged.maxLines), 1, 12);
          merged.fontSize = clamp(merged.fontSize, 8, 180);
        }
        return applyBounds(merged, bounds);
      }),
    );
  };

  const setCanvasSizeAndClamp = (next: { w: number; h: number }) => {
    const warnings: string[] = [];
    if (next.w < SIZE_MIN) warnings.push(`画布宽度最小不要小于${SIZE_MIN}`);
    if (next.w > SIZE_MAX) warnings.push(`画布宽度最大不要超出${SIZE_MAX}`);
    if (next.h < SIZE_MIN) warnings.push(`画布高度最小不要小于${SIZE_MIN}`);
    if (next.h > SIZE_MAX) warnings.push(`画布高度最大不要超出${SIZE_MAX}`);
    if (warnings.length) window.alert(warnings.join("\n"));

    const clamped = {
      w: clamp(next.w, SIZE_MIN, SIZE_MAX),
      h: clamp(next.h, SIZE_MIN, SIZE_MAX),
    };
    setCanvasSize(clamped);
    setElements((prev) => prev.map((el) => applyBounds(el, clamped)));
  };

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const getBounds = () => {
    return { w: canvasSize.w, h: canvasSize.h };
  };

  const updateSelected = (patch: Partial<PosterElement>) => {
    if (!selected) return;
    updateElement(selected.id, patch);
  };

  const onTemplateChangeRef = useRef(onTemplateChange);
  onTemplateChangeRef.current = onTemplateChange;

  useEffect(() => {
    onTemplateChangeRef.current?.({ canvasSize, elements, backgroundImage });
  }, [canvasSize, elements, backgroundImage]);

  // 鼠标滚轮缩放（以左上角为中心点）
  // 必须用 useEffect 手动挂载 non-passive listener，否则 preventDefault() 会报错
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale((s) => Math.max(0.1, Math.min(3, Math.round((s + delta) * 100) / 100)));
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  // scale 变化时同步输入框（非用户手动编辑时）
  const scaleInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (document.activeElement !== scaleInputRef.current) {
      setScaleInput(`${Math.round(scale * 100)}%`);
    }
  }, [scale]);

  const addElementAt = (type: PosterElement["type"], clientX: number, clientY: number) => {
    const bounds = getBounds();
    const node = posterRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    // 视觉像素转画布坐标：除以当前缩放比例
    const x = (clientX - r.left) / scale;
    const y = (clientY - r.top) / scale;

    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (type === "image") {
      const el: PosterImageElement = {
        id,
        type,
      src: "",
      x: clamp(x - 20, 0, Math.max(0, bounds.w - 220)),
      y: clamp(y - 20, 0, Math.max(0, bounds.h - 140)),
      width: 220,
      height: 140,
      zIndex: 0,
      variableKey: "",
      };
      setElements((prev) => [...prev, applyBounds(el, bounds)]);
      setSelectedId(id);
      return;
    }

    const el: PosterTextElement = {
      id,
      type,
      text: "输入文字",
      fontSize: 32,
      color: "#111827",
      maxLines: 2,
      textAlign: "left",
      verticalAlign: "top",
      x: clamp(x - 20, 0, Math.max(0, bounds.w - 360)),
      y: clamp(y - 20, 0, Math.max(0, bounds.h - 110)),
      width: 360,
      height: 110,
      zIndex: 0,
      variableKey: "",
    };
    setElements((prev) => [...prev, applyBounds(el, bounds)]);
    setSelectedId(id);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-poster-element");
    if (raw !== "image" && raw !== "text") return;
    addElementAt(raw, e.clientX, e.clientY);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex">
        <aside className="w-[300px] shrink-0 border-r border-zinc-200 bg-white px-4 py-6">
          {sidebarHeader ? <div className="mb-4">{sidebarHeader}</div> : null}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">工具栏</div>
              <div className="mt-1 text-xs text-zinc-500">拖拽到右侧画布</div>
            </div>
            <div className="rounded-xl bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              Prototype
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-poster-element", "image");
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm active:cursor-grabbing"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-800">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">图片</div>
                <div className="text-xs text-zinc-500">拖拽生成图片块</div>
              </div>
            </div>

            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-poster-element", "text");
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm active:cursor-grabbing"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-800">
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">文本</div>
                <div className="text-xs text-zinc-500">拖拽生成文字块</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-zinc-700">画布尺寸</div>
              <div className="text-[11px] text-zinc-500">px</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <CommitNumberField
                label="宽度"
                value={canvasSize.w}
                onCommit={(nextW) =>
                  setCanvasSizeAndClamp({
                    w: nextW,
                    h: canvasSize.h,
                  })
                }
              />
              <CommitNumberField
                label="高度"
                value={canvasSize.h}
                onCommit={(nextH) =>
                  setCanvasSizeAndClamp({
                    w: canvasSize.w,
                    h: nextH,
                  })
                }
              />
            </div>

            <div className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              已存在元素会随尺寸自动调整到可视范围内。
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white/70 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <Layers className="h-3.5 w-3.5" />
              背景图片
            </div>
            <div className="mt-2">
              {backgroundImage ? (
                <div className="relative overflow-hidden rounded-lg border border-zinc-200">
                  <img className="h-24 w-full object-contain" src={backgroundImage} alt="背景图" />
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundImage(null);
                      onBackgroundChange?.(null);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <label className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white py-2.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-800">
                <Upload className="h-3.5 w-3.5" />
                {backgroundImage ? "重新上传" : "上传背景图片"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = "";
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/uploads", { method: "POST", body: fd });
                    if (!res.ok) {
                      alert("上传失败");
                      return;
                    }
                    const data = (await res.json()) as { url: string };
                    setBackgroundImage(data.url);
                    onBackgroundChange?.(data.url);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-medium text-zinc-700">提示</div>
            <div className="mt-2 text-xs leading-relaxed text-zinc-600">
              1. 从左侧拖拽到画布。
              <br />
              2. 点击组件进入选中态。
              <br />
              3. 右侧属性面板可修改宽高/位置/文本内容。
              <br />
              4. <kbd className="rounded border border-zinc-300 bg-white px-1 text-[10px]">Ctrl</kbd> + 滚轮缩放画布。
            </div>
          </div>

          {sidebarFooter ? <div className="mt-4">{sidebarFooter}</div> : null}
        </aside>

        <main className="relative flex-1 overflow-hidden bg-zinc-200/60">
          {/* 缩放控件 - 右上角绝对定位 */}
          <div className="absolute right-6 top-6 z-10">
            <input
              ref={scaleInputRef}
              className="w-[52px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-right text-xs font-medium text-zinc-600 outline-none tabular-nums focus:border-zinc-400"
              value={scaleInput}
              onChange={(e) => {
                setScaleInput(e.target.value);
              }}
              onBlur={() => {
                const raw = scaleInput.replace(/%/g, "").trim();
                if (raw === "") {
                  setScaleInput(`${Math.round(scale * 100)}%`);
                  return;
                }
                const n = Number(raw);
                if (!Number.isFinite(n) || n <= 0) {
                  setScaleInput(`${Math.round(scale * 100)}%`);
                  return;
                }
                const clamped = Math.max(10, Math.min(300, Math.round(n)));
                const newScale = clamped / 100;
                setScale(newScale);
                setScaleInput(`${clamped}%`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  scaleInputRef.current?.blur();
                }
              }}
            />
          </div>

          <div className="h-full p-6">
            {/* 画布滚动区域 */}
            <div
              ref={scrollContainerRef}
              className="h-full overflow-auto"
            >
              <div
                className="relative rounded-2xl bg-zinc-200/40 p-6 shadow-sm"
                style={{
                  zoom: scale,
                  width: canvasSize.w + 48,
                  height: canvasSize.h + 48,
                  flexShrink: 0,
                }}
              >
                <div
                  ref={posterRef}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setSelectedId(null);
                  }}
                  className="relative overflow-hidden rounded-xl bg-white"
                  style={{ width: canvasSize.w, height: canvasSize.h }}
                >
                  {backgroundImage && (
                    <img
                      className="absolute inset-0 h-full w-full object-cover"
                      src={backgroundImage}
                      alt="背景图"
                      draggable={false}
                      style={{ zIndex: 0, pointerEvents: "none" }}
                    />
                  )}
                  {elements.map((el) => {
                    const isSelected = el.id === selectedId;
                    return (
                      <Rnd
                        key={el.id}
                        size={{ width: el.width, height: el.height }}
                        position={{ x: el.x, y: el.y }}
                        bounds="parent"
                        scale={scale}
                        minWidth={SIZE_MIN}
                        minHeight={SIZE_MIN}
                        enableResizing={isSelected}
                        style={{ zIndex: el.zIndex }}
                        dragHandleClassName="drag-handle"
                        onDragStart={() => {
                          setSelectedId(el.id);
                        }}
                        onDragStop={(_e, d) => {
                          updateElement(el.id, { x: d.x, y: d.y });
                        }}
                        onResizeStop={(_e, _direction, ref, _delta, position) => {
                          updateElement(el.id, {
                            x: position.x,
                            y: position.y,
                            width: ref.offsetWidth / scale,
                            height: ref.offsetHeight / scale,
                          });
                        }}
                      >
                        <div
                          className={[
                            "h-full w-full rounded-lg border border-transparent box-border drag-handle",
                            isSelected
                              ? "border-black/40 ring-2 ring-black/15"
                              : "border-zinc-200 hover:border-zinc-300",
                          ].join(" ")}
                          onClick={() => {
                            setSelectedId(el.id);
                          }}
                        >
                          {el.type === "image" ? (
                            isEmptyImageSrc(el.src) ? (
                              <ImageSlotPlaceholder />
                            ) : (
                              <img
                                className="h-full w-full object-cover"
                                src={el.src}
                                alt="poster image"
                                draggable={false}
                              />
                            )
                          ) : (
                            <div
                              className="flex h-full w-full flex-col p-2"
                              style={{
                                fontSize: el.fontSize,
                                color: el.color,
                                lineHeight: 1.15,
                                wordBreak: "break-word",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: el.maxLines,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textAlign: el.textAlign,
                                  alignSelf: "stretch",
                                  marginTop: el.verticalAlign === "center" ? "auto" : el.verticalAlign === "bottom" ? "auto" : "0",
                                  marginBottom: el.verticalAlign === "center" ? "auto" : el.verticalAlign === "bottom" ? "0" : "0",
                                }}
                              >
                                {el.text || (
                                  <span style={{ color: "#d4d4d8" }}>文本占位</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Rnd>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {selected ? (
            <div className="pointer-events-none absolute right-8 top-8 z-20 w-[320px]">
              <div className="pointer-events-auto rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                <ElementEditor element={selected} onChange={updateSelected} onDelete={() => {
                    setElements((prev) => prev.filter((e) => e.id !== selected.id));
                    setSelectedId(null);
                  }} />
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
