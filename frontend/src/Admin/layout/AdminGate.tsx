import { useAuth, useClerk } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { FiLock, FiLogIn, FiLogOut } from "react-icons/fi";
import { Link } from "react-router-dom";
import { AUTH_PATHS } from "../../AuthPage";
import { ApiError } from "../../lib/api";
import { useCurrentEmployee } from "../api/users";
import Button from "../components/Button";
import { ErrorNotice, Loading } from "../components/QueryState";
import { buttonClass } from "../components/styles";
import "../admin.css";

/**
 * Renders the console only for an active admin. Resolving GET /manager/me
 * first means no screen fires requests the API would reject anyway.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useCurrentEmployee({ enabled: Boolean(isSignedIn) });

  if (!isLoaded || (isSignedIn && me.isPending)) {
    return (
      <Screen>
        <Loading label="Checking your account…" />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen
        title="Sign in to the admin console"
        body="Use the account an admin invited you with."
        action={
          <Link to={AUTH_PATHS["sign-in"]} className={buttonClass("primary")}>
            <FiLogIn aria-hidden className="size-4" />
            Sign in
          </Link>
        }
      />
    );
  }

  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 403) {
      return (
        <Screen
          title="This account isn't on staff"
          body="You're signed in, but no employee record is linked to this account. Ask an admin to invite you."
          action={<SignOutButton />}
        />
      );
    }
    return (
      <Screen>
        <ErrorNotice title="Couldn't check your account" error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }

  const employee = me.data;
  if (employee?.employee_role !== "admin" || employee.employee_status !== "active") {
    return (
      <Screen
        title="Admins only"
        body={
          employee?.employee_status === "inactive"
            ? "Your employee account is inactive."
            : "This console is for system admins. Managers use the manager console, and cashiers the POS."
        }
        action={<SignOutButton />}
      />
    );
  }

  return <>{children}</>;
}

function Screen({
  title,
  body,
  action,
  children,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="admin-root grid min-h-screen w-full place-items-center bg-(--admin-canvas) px-4 text-(--admin-ink)">
      <div className="w-full max-w-md">
        {children ?? (
          <div className="rounded-2xl bg-(--admin-surface) p-8 text-center shadow-sm ring-1 ring-(--admin-line)">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-(--admin-gold)/15">
              <FiLock aria-hidden className="size-5" />
            </span>
            <h1 className="mt-4 text-lg font-semibold">{title}</h1>
            {body && <p className="mt-1 text-sm text-(--admin-muted)">{body}</p>}
            {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <Button icon={FiLogOut} onClick={() => void signOut({ redirectUrl: "/" })}>
      Sign out
    </Button>
  );
}
