"use client";

import { useCallback, useRef, useState } from "react";

interface UploadBoxProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function UploadBox({ onFileSelect, disabled = false }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files[0]);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "relative flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
          isDragging
            ? "border-leaf-500 bg-leaf-100/80 scale-[1.01]"
            : "border-leaf-300 bg-white hover:border-leaf-400 hover:bg-leaf-50/50",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />

        {previewUrl ? (
          <div className="flex w-full flex-col items-center gap-4 p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Uploaded leaf preview"
              className="max-h-64 max-w-full rounded-xl object-contain shadow-md"
            />
            <p className="text-sm text-earth-600">{fileName}</p>
            <p className="text-sm text-leaf-600">
              Click or drag a new image to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-8 w-8 text-leaf-600"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4m0 0L8 8m4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-leaf-900">
                Drop your leaf photo here
              </p>
              <p className="mt-1 text-sm text-earth-600">
                or click to browse — PNG, JPG, WEBP supported
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-sm text-earth-600">
        for best results please take a picture of a leaf on a grey background with ample lighting
      </p>
    </div>
  );
}
