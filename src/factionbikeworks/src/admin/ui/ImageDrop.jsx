import { useId, useRef, useState } from "react";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Client-side check; the server checks the bytes again. */
export function photoProblem(file) {
  if (!TYPES.includes(file.type)) return "Only JPG, PNG or WebP photos";
  if (file.size > MAX_PHOTO_BYTES) return "Photos must be 5 MB or smaller";
  return null;
}

/** Drop zone + file picker. Calls onFiles(validFiles) and onError(message) for rejects. */
export function ImageDrop({ onFiles, onError, multiple = true, label = "Drop photos or click to upload", compact = false, disabled = false }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const id = useId();
  const take = (list) => {
    const files = Array.from(list || []);
    const ok = [];
    for (const f of files) {
      const p = photoProblem(f);
      if (p) onError?.(p);
      else ok.push(f);
    }
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };
  return (
    <label
      htmlFor={id}
      className={`adm-drop ${over ? "is-over" : ""} ${compact ? "adm-drop--compact" : ""} ${disabled ? "is-disabled" : ""}`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) take(e.dataTransfer.files);
      }}
    >
      <input
        id={id}
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <span aria-hidden className="adm-drop-plus">+</span>
      <span>{label}</span>
    </label>
  );
}
