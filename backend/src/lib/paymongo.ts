import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

// The Checkout Session API's names for the methods the store takes.
export const PAYMONGO_METHODS = [
  "gcash",
  "paymaya",
  "grab_pay",
  "qrph",
  "card",
] as const;
export type PaymongoMethod = (typeof PAYMONGO_METHODS)[number];

export const isPaymongoMethod = (value: unknown): value is PaymongoMethod =>
  PAYMONGO_METHODS.includes(value as PaymongoMethod);

// PayMongo answered with an error. `message` is PayMongo's own detail, which
// is usually fit to show staff (e.g. "The amount must be at least 20.00").
export class PaymongoError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PaymongoError";
    this.status = status;
  }
}

const secretKey = (): string => process.env["PAYMONGO_SECRET_KEY"] ?? "";

// Read per call, not at import, so the server still boots without PayMongo
// settings; online payment just reports itself unavailable.
export const isPaymongoConfigured = (): boolean =>
  secretKey().startsWith("sk_") &&
  Boolean(process.env["PAYMONGO_SUCCESS_URL"]) &&
  Boolean(process.env["PAYMONGO_CANCEL_URL"]);

export const isWebhookConfigured = (): boolean =>
  Boolean(process.env["PAYMONGO_WEBHOOK_SECRET"]);

// Without the webhook secret a payment could go through and never be marked
// paid, so checkout needs it as much as it needs the API key.
export const isOnlinePaymentReady = (): boolean =>
  isPaymongoConfigured() && isWebhookConfigured();

// Test and live keys reach the same API; the key decides which one it is.
export const paymongoMode = (): "test" | "live" =>
  secretKey().startsWith("sk_live_") ? "live" : "test";

// HTTP Basic Auth: the secret key is the username, the password is empty.
const authHeader = (): string =>
  `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;

// PayMongo wraps request bodies as { data: { attributes } } and answers
// errors as { errors: [{ code, detail }] }.
export async function paymongoRequest<T>(
  method: "GET" | "POST",
  path: string,
  attributes?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    Accept: "application/json",
  };
  if (attributes !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers,
    body:
      attributes === undefined ? null : JSON.stringify({ data: { attributes } }),
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    const detail = body?.errors?.[0]?.detail;
    throw new PaymongoError(
      typeof detail === "string" ? detail : `PayMongo ${path} failed (${res.status})`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

// Paymongo-Signature is "t=<unix seconds>,te=<hex>,li=<hex>": an HMAC-SHA256
// of "<t>.<raw body>" with the webhook's signing secret, filled in under te
// for test-mode events and li for live ones. Only the one matching the key's
// mode is accepted, so a test event can't pay for a live order.
export function verifyWebhookSignature(
  rawBody: Buffer,
  header: string | undefined,
): boolean {
  const secret = process.env["PAYMONGO_WEBHOOK_SECRET"];
  if (!secret || !header) return false;

  const parts = new Map(
    header.split(",").map((part) => {
      const [key = "", ...value] = part.split("=");
      return [key.trim(), value.join("=").trim()] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get(paymongoMode() === "live" ? "li" : "te");
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
