import { useSignIn, useSignUp } from "@clerk/clerk-react";
import type { OAuthStrategy } from "@clerk/types";
import { useState } from "react";
import { FaMicrosoft } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { clerkErrorMessage } from "./clerkError";
import { FOCUS_RING, FormError } from "./fields";
import { AFTER_AUTH_PATH, SSO_CALLBACK_PATH, type AuthMode } from "./routes";

const BUTTON = `flex h-12 items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white text-[15px] font-semibold text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

/** OAuth buttons; each one leaves the page and comes back through the SSO callback route. */
export default function SocialButtons({ mode }: { mode: AuthMode }) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [pending, setPending] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (strategy: OAuthStrategy) => {
    const resource = mode === "sign-in" ? signIn : signUp;
    if (!resource) return;
    setPending(strategy);
    setError(null);
    try {
      await resource.authenticateWithRedirect({
        strategy,
        redirectUrl: SSO_CALLBACK_PATH,
        redirectUrlComplete: AFTER_AUTH_PATH,
      });
    } catch (err) {
      setPending(null);
      setError(clerkErrorMessage(err));
    }
  };

  const verb = mode === "sign-in" ? "Continue" : "Sign up";

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <button type="button" disabled={pending !== null} onClick={() => void start("oauth_google")} className={BUTTON}>
        <FcGoogle aria-hidden className="size-5" />
        {verb} with Google
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void start("oauth_microsoft")}
        className={BUTTON}
      >
        <FaMicrosoft aria-hidden className="size-4 text-[#0078D4]" />
        {verb} with Microsoft
      </button>
    </div>
  );
}
