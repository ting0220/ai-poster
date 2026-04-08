"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FontItem } from "./posterTypes";

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

export function useFonts() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const newFont: FontItem = data.font;
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

  return { fonts, loading, uploading, error, loadFonts, uploadFont, deleteFont };
}
