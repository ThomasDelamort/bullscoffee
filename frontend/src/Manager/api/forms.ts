/** Helpers for turning manager form state into API request bodies. */

/** pg sends DECIMAL columns as strings ("120.00"), but the screens do maths on them. */
export function numeric<T extends object, K extends keyof T>(row: T, ...keys: K[]): T {
  const copy = { ...row };
  for (const key of keys) copy[key] = Number(row[key]) as T[K];
  return copy;
}

/** What happened to a form's image: untouched, cleared, or swapped for a new file. */
export type ImageChange = { kind: "keep" } | { kind: "remove" } | { kind: "replace"; file: File };

type FormValue = string | number | boolean | null | undefined;

/**
 * Multipart body for the routes that take an `image` upload (products,
 * categories, ingredients, suppliers). An empty image_url with no file is the
 * backend's signal to remove the image; leaving both out keeps it.
 */
export function toFormData(fields: Record<string, FormValue>, image: ImageChange): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value === null ? "" : String(value));
  }
  if (image.kind === "replace") form.append("image", image.file);
  else if (image.kind === "remove") form.append("image_url", "");
  return form;
}
