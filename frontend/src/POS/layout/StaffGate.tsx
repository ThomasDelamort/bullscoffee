import { useAuth, useClerk } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AUTH_PATHS } from "../../AuthPage";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import { ApiError } from "../../lib/api";
import { useCurrentEmployee } from "../api/catalog";
import { ErrorNotice, Loading } from "../components/QueryState";
import { buttonClass } from "../components/styles";

/** The register is for active staff; everyone else gets told why instead of a screen of failed requests. */
export default function StaffGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const me = useCurrentEmployee({ enabled: Boolean(isSignedIn) });

  if (!isLoaded || (isSignedIn && me.isPending)) {
    return (
      <Screen>
        <Loading label="Opening the register…" />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen title="Sign in to open the register" body="Use your Bull's Coffee staff account.">
        <Link to={AUTH_PATHS["sign-in"]} className={buttonClass("primary")}>
          Sign in
        </Link>
      </Screen>
    );
  }

  const notStaff = me.error instanceof ApiError && me.error.status === 403;
  if (me.error && !notStaff) {
    return (
      <Screen>
        <ErrorNotice title="Couldn't check your staff account" error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }

  if (notStaff || me.data?.employee_status !== "active") {
    return (
      <Screen
        title={notStaff ? "This register is for staff" : "Your staff account is inactive"}
        body={
          notStaff
            ? "You're signed in with an account that isn't on the staff list. Sign in with your staff account instead."
            : "Ask a manager to reactivate it, then sign in again."
        }
      >
        <button type="button" onClick={() => void signOut({ redirectUrl: AUTH_PATHS["sign-in"] })} className={buttonClass("secondary")}>
          Switch account
        </button>
      </Screen>
    );
  }

  return children;
}

function Screen({ title, body, children }: { title?: string; body?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <HeroImage file={LOGO_MARK} alt="Bull's Coffee" placeholderShape="circle" className="mx-auto mb-5 size-12 object-contain" />
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
        {body && <p className="mt-1.5 text-sm text-(--pos-muted)">{body}</p>}
        <div className={title ? "mt-6 flex justify-center" : ""}>{children}</div>
      </div>
    </main>
  );
}
