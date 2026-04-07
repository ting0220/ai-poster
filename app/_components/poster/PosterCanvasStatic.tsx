"use client";

import React from "react";

export type RenderPosterElement = {
  id: string;
  type: "image" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;

  variableKey: string;

  // image
  src?: string | null;

  // text
  defaultText?: string | null;
  fontSize?: number | null;
  color?: string | null;
  maxLines?: number | null;
  textAlign?: "left" | "center" | "right" | null;
  verticalAlign?: "top" | "center" | "bottom" | null;
};

export default function PosterCanvasStatic({
  canvasSize,
  elements,
  values,
  backgroundImage,
  showGrid = false,
}: {
  canvasSize: { w: number; h: number };
  elements: RenderPosterElement[];
  values: Record<string, string | undefined>;
  backgroundImage?: string | null;
  showGrid?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border border-zinc-200 bg-white",
        showGrid ? "bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[length:24px_24px]" : "",
      ].join(" ")}
      style={{ width: canvasSize.w, height: canvasSize.h }}
    >
      {backgroundImage && (
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={backgroundImage}
          alt="背景图"
          draggable={false}
          style={{ zIndex: 0 }}
        />
      )}
      {elements
        .slice()
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((el) => {
          const isImage = el.type === "image";
          const left = el.x;
          const top = el.y;

          if (isImage) {
            const src = values[el.variableKey] ?? el.src ?? "";

            return (
              <div
                key={el.id}
                className="absolute overflow-hidden"
                style={{ left, top, width: el.width, height: el.height, zIndex: el.zIndex }}
              >
                {src ? (
                  <img className="h-full w-full object-cover" src={src} alt="poster image" draggable={false} />
                ) : (
                  <div className="h-full w-full rounded-md border border-dashed border-zinc-300 bg-zinc-50" />
                )}
              </div>
            );
          }

          const text = values[el.variableKey] ?? el.defaultText ?? "";
          const fontSize = el.fontSize ?? 32;
          const color = el.color ?? "#111827";
          const maxLines = el.maxLines ?? 2;
          const textAlign = (el.textAlign ?? "left") as "left" | "center" | "right";
          const verticalAlign = (el.verticalAlign ?? "top") as "top" | "center" | "bottom";

          return (
            <div
              key={el.id}
              className="absolute"
              style={{ left, top, width: el.width, height: el.height, zIndex: el.zIndex }}
            >
              <div
                className="flex h-full w-full flex-col p-0"
                style={{
                  fontSize,
                  color,
                  lineHeight: 1.15,
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: maxLines,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textAlign,
                    alignSelf: "stretch",
                    marginTop: verticalAlign === "center" ? "auto" : verticalAlign === "bottom" ? "auto" : "0",
                    marginBottom: verticalAlign === "center" ? "auto" : verticalAlign === "bottom" ? "0" : "0",
                  }}
                >
                  {text}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

