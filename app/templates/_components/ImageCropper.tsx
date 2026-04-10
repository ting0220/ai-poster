"use client";

import React, { useCallback, useRef } from "react";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

interface ImageCropperProps {
  imageUrl: string;
  targetWidth: number;
  targetHeight: number;
  referenceWidth: number;
  referenceHeight: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  imageUrl,
  targetWidth,
  targetHeight,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  const ASPECT_RATIO = targetWidth / targetHeight;

  const onReset = useCallback(() => {
    cropperRef.current?.cropper.reset();
  }, []);

  const handleConfirm = useCallback(async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: targetWidth,
      height: targetHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  }, [targetWidth, targetHeight, onConfirm]);

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-[2px] bg-blue-500" />
          <span className="text-sm font-medium text-zinc-700">
            建议 {targetWidth}×{targetHeight}
          </span>
          <span className="text-xs text-zinc-400">
            比例 {Number(ASPECT_RATIO.toFixed(2))} · 拖拽选区
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
          >
            重置
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            完成
          </button>
        </div>
      </div>

      {/* 裁剪区 */}
      <div className="relative overflow-hidden rounded-xl bg-zinc-200">
        <Cropper
          ref={cropperRef}
          src={imageUrl}
          style={{ maxHeight: 420 }}
          viewMode={0}
          dragMode="move"
          aspectRatio={ASPECT_RATIO}
          guides={true}
          highlight={false}
          cropBoxMovable={false}
          cropBoxResizable={true}
          toggleDragModeOnDblclick={false}
          autoCropArea={0.9}
          ready={() => {
            const cropper = cropperRef.current?.cropper;
            if (!cropper) return;
            // 延迟一帧执行，确保图片已完全加载并布局完成
            requestAnimationFrame(() => {
              const containerData = cropper.getContainerData();
              const imageData = cropper.getImageData();
              if (!imageData.naturalWidth) return;

              // 宽图：裁剪框宽=图片宽，高等比例，居中
              // 高图：裁剪框高=图片高，宽等比例，居中
              const cropBoxWidth = imageData.width;
              const cropBoxHeight = imageData.width / ASPECT_RATIO;

              cropper.setCropBoxData({
                left: imageData.left,
                top: imageData.top + (imageData.height - cropBoxHeight) / 2,
                width: cropBoxWidth,
                height: cropBoxHeight,
              });
            });
          }}
        />
      </div>
    </div>
  );
}
