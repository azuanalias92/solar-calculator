"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { clearAuthState, getAuthState, setAuthState, type AuthState } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

type Props = {
  locale?: string;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleAuthButton({ locale }: Props) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const initializedRef = useRef(false);

  const clientId = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "", []);
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);

  useEffect(() => {
    const refresh = () => setAuth(getAuthState());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("kirasolar:auth", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kirasolar:auth", refresh);
    };
  }, []);

  // Initialize Google GIS once
  useEffect(() => {
    if (!clientId) return;
    if (initializedRef.current) return;

    let canceled = false;
    const init = async () => {
      while (!canceled && !window.google?.accounts?.id) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (canceled) return;
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setSigningIn(true);
          try {
            const response = await fetch(`${apiBaseUrl}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });

            if (!response.ok) return;
            const payload = (await response.json()) as { token: string; user: AuthState["user"] };
            setAuthState({ token: payload.token, user: payload.user });
          } finally {
            setSigningIn(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      initializedRef.current = true;
    };

    void init();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, clientId]);

  const handleSignIn = () => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.prompt();
  };

  if (auth) {
    return (
      <div className="flex items-center gap-2">
        {auth.user.picture ? (
          <Image
            src={auth.user.picture}
            alt={auth.user.name ?? "User"}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border-2 border-emerald-200"
            unoptimized
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700">
            {(auth.user.name ?? "U")[0]}
          </div>
        )}
        <span className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate">
          {auth.user.name ?? auth.user.email ?? ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.google?.accounts?.id?.disableAutoSelect?.();
            clearAuthState();
          }}
        >
          Logout
        </Button>
      </div>
    );
  }

  if (!clientId) {
    return (
      <Button variant="outline" size="sm" disabled>
        Login
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignIn}
      disabled={signingIn}
      className="gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
    >
      <GoogleIcon className="w-4 h-4" />
      <span>{signingIn ? "Signing in..." : "Sign in with Google"}</span>
    </Button>
  );
}
