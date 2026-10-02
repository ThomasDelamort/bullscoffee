/**
 * Thin fetch wrapper for the Express API. Every response comes through the
 * backend's responseFormatter as { status, statusCode, error, message, data },
 * so callers get `data` back and failures become an ApiError.
 */

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 4xx: retrying won't change the answer. */
export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface ApiClient {
  get<T>(path: string, params?: QueryParams): Promise<T>;
  /** A FormData body is sent as multipart (for image uploads); anything else as JSON. */
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
  /** For endpoints that answer with a file rather than JSON, e.g. CSV exports. */
  download(path: string, params?: QueryParams): Promise<{ blob: Blob; filename: string | null }>;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: "Your session has expired. Sign in again.",
  403: "Your account doesn't have access to this.",
  404: "The server doesn't support this yet.",
};

function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return `${API_URL}/api${path}${query ? `?${query}` : ""}`;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  const { error, message } = (body ?? {}) as { error?: unknown; message?: unknown };
  const text =
    (typeof error === "string" && error) ||
    (typeof message === "string" && message) ||
    FALLBACK_MESSAGES[res.status] ||
    (res.status >= 500 ? "Something went wrong on the server. Try again." : `Request failed (${res.status}).`);
  return new ApiError(text, res.status);
}

/** "attachment; filename=sales-daily-2026-10-01.csv" → "sales-daily-2026-10-01.csv" */
function filenameFrom(disposition: string | null): string | null {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]!) : null;
}

/** `getToken` is Clerk's session token getter; it's called per request so tokens never go stale. */
export function createApiClient(getToken: () => Promise<string | null>): ApiClient {
  async function send(method: string, path: string, body?: unknown, params?: QueryParams): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      // The browser sets the multipart boundary itself.
      payload = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetch(buildUrl(path, params), { method, headers, body: payload });
    } catch {
      throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
    }
    if (!res.ok) throw await toApiError(res);
    return res;
  }

  async function json<T>(method: string, path: string, body?: unknown, params?: QueryParams): Promise<T> {
    const res = await send(method, path, body, params);
    const envelope = (await res.json().catch(() => ({}))) as { data?: T };
    return envelope.data as T;
  }

  return {
    get: (path, params) => json("GET", path, undefined, params),
    post: (path, body) => json("POST", path, body),
    put: (path, body) => json("PUT", path, body),
    patch: (path, body) => json("PATCH", path, body),
    delete: (path) => json("DELETE", path),
    async download(path, params) {
      const res = await send("GET", path, undefined, params);
      return { blob: await res.blob(), filename: filenameFrom(res.headers.get("Content-Disposition")) };
    },
  };
}

/** Hands a Blob to the user as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
