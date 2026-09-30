import { useRef, useState } from "react";
import { FiImage, FiTrash2, FiUpload } from "react-icons/fi";
import Button from "./Button";

// Same limits as backend/src/middleware/upload.middleware.ts.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

interface ImageFieldProps {
  label: string;
  /** Current image: a stored URL, or a preview of a file just chosen. */
  value: string | null;
  /** The picked File is what the backend's multipart upload needs; the URL is only a preview. */
  onChange: (previewUrl: string | null, file: File | null) => void;
  hint?: string;
  className?: string;
}

export default function ImageField({ label, value, onChange, hint = "Optional. JPEG, PNG, WebP or GIF, up to 5 MB.", className = "" }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return setError("Use a JPEG, PNG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return setError("The image must be 5 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      onChange(String(reader.result), file);
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-(--mgr-line)" />
        ) : (
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-lg bg-(--mgr-accent)/12 text-(--mgr-muted) ring-1 ring-(--mgr-line)"
          >
            <FiImage className="size-6" />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={FiUpload} onClick={() => inputRef.current?.click()}>
            {value ? "Replace image" : "Upload image"}
          </Button>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              icon={FiTrash2}
              onClick={() => {
                setError(null);
                onChange(null, null);
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPTED_TYPES.join(",")}
        aria-label={label}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-(--mgr-muted)">{hint}</p>
      )}
    </div>
  );
}
