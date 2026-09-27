export type AuthMode = "sign-in" | "sign-up";

export const AUTH_PATHS: Record<AuthMode, string> = {
  "sign-in": "/sign-in",
  "sign-up": "/sign-up",
};

/** Where OAuth providers send the user back to; mounts Clerk's redirect callback. */
export const SSO_CALLBACK_PATH = "/sso-callback";

export const AFTER_AUTH_PATH = "/";
