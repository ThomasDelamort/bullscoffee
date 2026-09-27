import { useSignIn } from "@clerk/clerk-react";
import { useState, type FormEvent } from "react";
import { FiKey, FiLock, FiMail } from "react-icons/fi";
import { clerkErrorMessage } from "./clerkError";
import { FormError, PasswordField, StepHeader, SubmitButton, TextButton, TextField } from "./fields";

interface ResetPasswordFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

/** Email a reset code, then set a new password with it. */
export default function ResetPasswordForm({ email, onEmailChange, onBack, onComplete }: ResetPasswordFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    void run(async () => {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setCodeSent(true);
    });
  };

  const resetPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    void run(async () => {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onComplete();
      } else {
        setError("Your password was updated. Sign in with your new password to continue.");
      }
    });
  };

  const back = (
    <div className="text-center">
      <TextButton onClick={onBack}>Back to sign in</TextButton>
    </div>
  );

  if (!codeSent) {
    return (
      <form onSubmit={sendCode} className="flex flex-col gap-5">
        <StepHeader title="Reset your password">We'll email you a code to set a new one.</StepHeader>
        <FormError message={error} />
        <TextField
          label="Email address"
          icon={FiMail}
          type="email"
          value={email}
          onChange={onEmailChange}
          required
          autoFocus
          autoComplete="email"
          placeholder="student@nu-cebu.edu.ph"
        />
        <SubmitButton busy={busy} disabled={!isLoaded}>
          Send reset code
        </SubmitButton>
        {back}
      </form>
    );
  }

  return (
    <form onSubmit={resetPassword} className="flex flex-col gap-5">
      <StepHeader title="Set a new password">Enter the code we sent to {email}.</StepHeader>
      <FormError message={error} />
      <TextField
        label="Reset code"
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
      <PasswordField
        label="New password"
        icon={FiLock}
        value={password}
        onChange={setPassword}
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <SubmitButton busy={busy}>Update password</SubmitButton>
      {back}
    </form>
  );
}
