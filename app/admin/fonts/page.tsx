"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Type, Upload, Loader2, Trash, X } from "lucide-react";
import type { FontItem } from "@/app/_components/poster/posterTypes";

const injectedFonts = new Set<string>();

/** 将字体 URL 注入为 @font-face，避免重复注入 */
function injectFontFace(font: FontItem) {
  if (injectedFonts.has(font.name)) return;
  injectedFonts.add(font.name);

  const formatMap: Record<string, string> = {
    ttf: "truetype",
    otf: "opentype",
    woff: "woff",
    woff2: "woff2",
  };
  const fmt = formatMap[font.format] ?? font.format;

  const style = document.createElement("style");
  style.dataset.font = font.name;
  style.textContent = `@font-face {
  font-family: "${font.name}";
  src: url("${font.url}") format("${fmt}");
  font-display: swap;
}`;
  document.head.appendChild(style);
}

export default function FontsManagementPage() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontUploadName, setFontUploadName] = useState("");
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const loadedRef = useRef(false);

  const loadFonts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fonts");
      if (!res.ok) throw new Error("加载字体列表失败");
      const data = (await res.json()) as { fonts: FontItem[] };
      setFonts(data.fonts);
      // 自动注入已有字体
      data.fonts.forEach(injectFontFace);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFonts();
  }, [loadFonts]);

  /** 上传字体文件 */
  const uploadFont = useCallback(
    async (file: File, customName?: string): Promise<FontItem | null> => {
      setUploading(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (customName) fd.append("name", customName);
        const res = await fetch("/api/fonts", { method: "POST", body: fd });
        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {
          // 响应体不是合法 JSON（如服务端 500 HTML）
        }
        if (!res.ok) {
          setError((data.error as string) ?? `上传失败（HTTP ${res.status}）`);
          return null;
        }
        const newFont: FontItem = data.font as FontItem;
        injectFontFace(newFont);
        setFonts((prev) => [newFont, ...prev]);
        return newFont;
      } catch (e) {
        setError(e instanceof Error ? e.message : "上传失败");
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  /** 删除字体 */
  const deleteFont = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/fonts?id=${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      setFonts((prev) => prev.filter((f) => f.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  const openUploadModal = () => {
    setFontUploadName("");
    setFontUploadError(null);
    setError(null);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await uploadFont(file, fontUploadName || undefined);
    if (result) {
      closeUploadModal();
    } else {
      setFontUploadError(error ?? "上传失败");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* 头部 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Type className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">字体管理</h1>
              <p className="text-sm text-zinc-500">上传和管理自定义字体，用于海报文本渲染</p>
            </div>
          </div>
        </div>

        {/* 字体列表 */}
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-medium text-zinc-900">已上传字体</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {fonts.length}
              </span>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
          </div>

          {fonts.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
              <Type className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-sm text-zinc-500">暂无已上传字体</p>
              <p className="text-xs text-zinc-400">点击下方「上传字体」添加新字体</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fonts.map((font) => (
                <div
                  key={font.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-medium text-zinc-900"
                      style={{ fontFamily: font.name }}
                    >
                      {font.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">
                        {font.format.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: font.name }}>AaBb 中文字体预览</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`确定删除字体「${font.name}」吗？\n删除后已用该字体的文本将回退到默认字体。`)) return;
                      await deleteFont(font.id);
                    }}
                    className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="删除字体"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 上传字体按钮 */}
        <button
          type="button"
          onClick={openUploadModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Upload className="h-4 w-4" />
          上传字体
        </button>

        {/* 上传弹窗 */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900">上传字体</h3>
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-zinc-600">字体名称（留空则使用文件名）</span>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                    type="text"
                    placeholder="例如：思源黑体"
                    value={fontUploadName}
                    onChange={(e) => setFontUploadName(e.target.value)}
                  />
                </label>
              </div>

              {fontUploadError && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {fontUploadError}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-8 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    <span className="text-sm text-zinc-600">上传中…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700">点击选择字体文件</span>
                    <span className="text-xs text-zinc-500">支持 .ttf .otf .woff .woff2 格式</span>
                  </>
                )}
                <input
                  type="file"
                  className="sr-only"
                  accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf,application/octet-stream"
                  disabled={uploading}
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
