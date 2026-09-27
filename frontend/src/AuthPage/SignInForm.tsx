import { useSignIn } from "@clerk/clerk-react";
import type { SignInResource } from "@clerk/types";
import { useState, type FormEvent, type ReactNode } from "react";
import { FiKey, FiLock, FiMail } from "react-icons/fi";
import { clerkErrorMessage } from "./clerkError";
import { FormError, PasswordField, StepHeader, SubmitButton, TextButton, TextField } from "./fields";

type SecondFactor = "email_code" | "totp";

interface SignInFormProps {
  /** Shown above the first step only, e.g. the social sign-in buttons. */
  leading?: ReactNode;
  email: string;
  onEmailChange: (email: string) => void;
  onForgotPassword: () => void;
  onComplete: () => void;
}

export default function SignInForm({ leading, email, onEmailChange, onForgotPassword, onComplete }: SignInFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secondFactor, setSecondFactor] = useState<SecondFactor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (result: SignInResource) => {
    if (result.status === "complete") {
      await setActive?.({ session: result.createdSessionId });
      onComplete();
      return;
    }
    if (result.status === "needs_second_factor") {
      const factors = result.supportedSecondFactors ?? [];
      const emailFactor = factors.find((f) => f.strategy === "email_code");
      if (emailFactor) {
        await result.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        setSecondFactor("email_code");
        return;
      }
      if (factors.some((f) => f.strategy === "totp")) {
        setSecondFactor("totp");
        return;
      }
    }
    setError("This account needs a sign-in step we don't support yet. Try another sign-in method.");
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      await finish(await signIn.create({ identifier: email.trim(), password }));
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !secondFactor) return;
    setBusy(true);
    setError(null);
    try {
      await finish(await signIn.attemptSecondFactor({ strategy: secondFactor, code: code.trim() }));
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (secondFactor) {
    return (
      <form onSubmit={submitCode} className="flex flex-col gap-5">
        <StepHeader title="Verify it's you">
          {secondFactor === "email_code"
            ? `Enter the 6-digit code we sent to ${email}.`
            : "Enter the 6-digit code from your authenticator app."}
        </StepHeader>
        <FormError message={error} />
        <TextField
          label="Verification code"
          icon={FiKey}
          value={code}
          onChange={setCode}
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className="tracking-[0.3em]"
        />
        <SubmitButton busy={busy}>Verify</SubmitButton>
        <div className="text-center">
          <TextButton
            onClick={() => {
              setSecondFactor(null);
              setCode("");
              setError(null);
            }}
          >
            Back to sign in
          </TextButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="flex flex-col gap-5">
      {leading}
      <FormError message={error} />
      <TextField
        label="Email address"
        icon={FiMail}
        type="email"
        value={email}
        onChange={onEmailChange}
        required
        autoComplete="email"
        placeholder="student@nu-cebu.edu.ph"
      />
      <PasswordField
        label="Password"
        icon={FiLock}
        value={password}
        onChange={setPassword}
        required
        autoComplete="current-password"
        placeholder="••••••••"
        labelAside={<TextButton onClick={onForgotPassword}>Forgot password?</TextButton>}
      />
      <SubmitButton busy={busy} disabled={!isLoaded}>
        Sign In
      </SubmitButton>
    </form>
  );
}
