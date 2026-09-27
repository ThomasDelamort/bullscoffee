import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";

const FALLBACK = "Something went wrong. Please try again.";

/** First human-readable message from a Clerk API error, or a generic fallback. */
export function clerkErrorMessage(err: unknown): string {
  if (!isClerkAPIResponseError(err)) return FALLBACK;
  const first = err.errors[0];
  return first?.longMessage ?? first?.message ?? FALLBACK;
}

export function clerkErrorCode(err: unknown): string | undefined {
  return isClerkAPIResponseError(err) ? err.errors[0]?.code : undefined;
}
