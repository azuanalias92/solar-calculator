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
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              locale?: string;
            },
          ) => void;
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

export default function GoogleAuthButton({ locale }: Props) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (auth) return;
    if (!clientId) return;
    if (!buttonRef.current) return;
    if (initializedRef.current) return;

    let canceled = false;

    const init = async () => {
      while (!canceled && !window.google?.accounts?.id) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (canceled) return;
      const idApi = window.google?.accounts?.id;
      if (!idApi) return;

      idApi.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          const response = await fetch(`${apiBaseUrl}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });

          if (!response.ok) return;
          const payload = (await response.json()) as { token: string; user: AuthState["user"] };
          setAuthState({ token: payload.token, user: payload.user });
        },
        cancel_on_tap_outside: true,
      });

      const parent = buttonRef.current;
      if (!parent) return;
      parent.innerHTML = "";
      idApi.renderButton(parent, { theme: "outline", size: "large", locale });
      initializedRef.current = true;
    };

    void init();

    return () => {
      canceled = true;
    };
  }, [auth, apiBaseUrl, clientId, locale]);

  if (auth) {
    return (
      <div className="flex items-center gap-2">
        {auth.user.picture ? (
          <Image
            src={auth.user.picture}
            alt={auth.user.name ?? "User"}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full"
            unoptimized
          />
        ) : null}
        <Button
          variant="secondary"
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
      <Button variant="secondary" disabled>
        Login
      </Button>
    );
  }

  return <div ref={buttonRef} />;
}
