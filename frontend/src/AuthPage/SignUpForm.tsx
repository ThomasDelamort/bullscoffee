import { useSignUp } from "@clerk/clerk-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { FiKey, FiLock, FiMail, FiUser } from "react-icons/fi";
import { clerkErrorCode, clerkErrorMessage } from "./clerkError";
import { FormError, PasswordField, StepHeader, SubmitButton, TextButton, TextField } from "./fields";

interface SignUpFormProps {
  /** Shown above the first step only, e.g. the social sign-in buttons. */
  leading?: ReactNode;
  email: string;
  onEmailChange: (email: string) => void;
  onComplete: () => void;
}

export default function SignUpForm({ leading, email, onEmailChange, onComplete }: SignUpFormProps) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
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

  const createAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    void run(async () => {
      const credentials = { emailAddress: email.trim(), password };
      try {
        await signUp.create({ ...credentials, firstName: firstName.trim(), lastName: lastName.trim() });
      } catch (err) {
        // Name fields are rejected when they're turned off in the Clerk dashboard;
        // the backend then asks for the name after sign-up instead.
        if (clerkErrorCode(err) !== "form_param_unknown") throw err;
        await signUp.create(credentials);
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    });
  };

  const verifyEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    void run(async () => {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onComplete();
      } else {
        setError("We couldn't finish creating your account. Please try again.");
      }
    });
  };

  const resendCode = () => {
    if (!isLoaded) return;
    void run(() => signUp.prepareEmailAddressVerification({ strategy: "email_code" }).then(() => undefined));
  };

  if (verifying) {
    return (
      <form onSubmit={verifyEmail} className="flex flex-col gap-5">
        <StepHeader title="Check your email">Enter the 6-digit code we sent to {email}.</StepHeader>
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
        <SubmitButton busy={busy}>Verify email</SubmitButton>
        <div className="flex items-center justify-center gap-6">
          <TextButton onClick={resendCode}>Resend code</TextButton>
          <TextButton
            onClick={() => {
              setVerifying(false);
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </TextButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={createAccount} className="flex flex-col gap-5">
      {leading}
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          icon={FiUser}
          value={firstName}
          onChange={setFirstName}
          required
          autoComplete="given-name"
          placeholder="Juan"
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={setLastName}
          required
          autoComplete="family-name"
          placeholder="Dela Cruz"
        />
      </div>
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
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      {/* Clerk mounts its bot-protection challenge here when it's enabled. */}
      <div id="clerk-captcha" />
      <SubmitButton busy={busy} disabled={!isLoaded}>
        Create Account
      </SubmitButton>
    </form>
  );
}
