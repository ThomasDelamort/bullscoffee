import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import "./AuthPage.css";
import BrandPanel, { BrandMark } from "./BrandPanel";
import { Divider, FOCUS_RING } from "./fields";
import ResetPasswordForm from "./ResetPasswordForm";
import { AFTER_AUTH_PATH, AUTH_PATHS, type AuthMode } from "./routes";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";
import SocialButtons from "./SocialButtons";

const TABS: { mode: AuthMode; label: string }[] = [
  { mode: "sign-in", label: "Sign In" },
  { mode: "sign-up", label: "Create Account" },
];

/** Full-page sign in / create account, served at /sign-in and /sign-up. */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  // Lives here so the address carries over when switching tabs.
  const [email, setEmail] = useState("");

  if (isLoaded && isSignedIn) return <Navigate to={AFTER_AUTH_PATH} replace />;

  const complete = () => navigate(AFTER_AUTH_PATH, { replace: true });

  return (
    <div className="auth-page grid min-h-dvh grid-cols-1 bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <BrandPanel />

      <main className="flex flex-col justify-center gap-8 px-5 py-10 sm:px-10 lg:px-14">
        <div className="lg:hidden">
          <BrandMark tone="light" />
        </div>

        <div className="mx-auto flex w-full max-w-160 flex-col gap-7">
          <nav
            aria-label="Account"
            className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1.5"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.mode}
                to={AUTH_PATHS[tab.mode]}
                replace
                aria-current={tab.mode === mode ? "page" : undefined}
                className={`rounded-xl py-3 text-center text-[15px] font-bold text-stone-500 transition-colors hover:text-stone-800 aria-[current=page]:bg-white aria-[current=page]:text-stone-900 aria-[current=page]:shadow-sm ${FOCUS_RING}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Keyed by mode so switching tabs starts that flow fresh. */}
          <AuthFlow
            key={mode}
            mode={mode}
            email={email}
            onEmailChange={setEmail}
            onComplete={complete}
          />
        </div>
      </main>
    </div>
  );
}

interface AuthFlowProps {
  mode: AuthMode;
  email: string;
  onEmailChange: (email: string) => void;
  onComplete: () => void;
}

function AuthFlow({ mode, email, onEmailChange, onComplete }: AuthFlowProps) {
  const [resettingPassword, setResettingPassword] = useState(false);

  const social = (
    <>
      <SocialButtons mode={mode} />
      <Divider>
        {mode === "sign-in" ? "Or email login" : "Or sign up with email"}
      </Divider>
    </>
  );

  if (mode === "sign-up") {
    return (
      <SignUpForm
        leading={social}
        email={email}
        onEmailChange={onEmailChange}
        onComplete={onComplete}
      />
    );
  }

  if (resettingPassword) {
    return (
      <ResetPasswordForm
        email={email}
        onEmailChange={onEmailChange}
        onBack={() => setResettingPassword(false)}
        onComplete={onComplete}
      />
    );
  }

  return (
    <SignInForm
      leading={social}
      email={email}
      onEmailChange={onEmailChange}
      onForgotPassword={() => setResettingPassword(true)}
      onComplete={onComplete}
    />
  );
}
