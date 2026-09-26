import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useCustomer } from "./customerContext";

const BUTTON =
  "rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50";
const INPUT =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

export default function RegistrationNotice() {
  const { state, register } = useCustomer();

  switch (state.status) {
    case "registering":
      return <Toast>Setting up your account…</Toast>;
    case "registered":
      return state.isNew ? (
        <Welcome key={state.customer.clerk_id} name={state.customer.first_name} />
      ) : null;
    case "needs-name":
      return <NameForm onSubmit={register} />;
    case "error":
      return (
        <Toast role="alert">
          <span>{state.message}</span>
          <button type="button" className={BUTTON} onClick={() => void register()}>
            Try again
          </button>
        </Toast>
      );
    default:
      return null;
  }
}

function Toast({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
  return (
    <div
      role={role}
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-4 rounded-2xl bg-white p-4 text-sm text-stone-900 shadow-xl ring-1 ring-stone-900/10"
    >
      {children}
    </div>
  );
}

function Welcome({ name }: { name: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <Toast>Welcome to Bull's Coffee, {name}!</Toast>;
}

function NameForm({
  onSubmit,
}: {
  onSubmit: (names: { first_name: string; last_name: string }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit({ first_name: firstName.trim(), last_name: lastName.trim() });
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-stone-900/40 p-4">
      <form
        onSubmit={submit}
        aria-labelledby="finish-signup-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 text-stone-900 shadow-xl"
      >
        <div>
          <h2 id="finish-signup-title" className="text-lg font-semibold">
            Finish signing up
          </h2>
          <p className="text-sm text-stone-600">We couldn't get your name from your account.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          First name
          <input
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Last name
          <input
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={INPUT}
          />
        </label>
        <button type="submit" className={BUTTON} disabled={!firstName.trim() || !lastName.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
