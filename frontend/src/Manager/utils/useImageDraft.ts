import { useState } from "react";
import type { ImageChange } from "../api/forms";

/**
 * Form state behind an <ImageField>: what to preview, and what to send. A
 * stored image is only removed if it existed to begin with.
 */
export function useImageDraft(initialUrl: string | null) {
  const [preview, setPreview] = useState(initialUrl);
  const [change, setChange] = useState<ImageChange>({ kind: "keep" });

  const onChange = (previewUrl: string | null, file: File | null) => {
    setPreview(previewUrl);
    if (file) setChange({ kind: "replace", file });
    else setChange(initialUrl ? { kind: "remove" } : { kind: "keep" });
  };

  return { preview, change, onChange };
}
