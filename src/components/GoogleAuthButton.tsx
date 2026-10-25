"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuthState, setAuthState, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

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
              logo_alignment?: "left" | "center";
            },
          ) => void;
          prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

type Props = {
  locale?: string;
};

const DEFAULT_GOOGLE_CLIENT_ID =
  "1004921240672-ong7k2d2fv3t1n6nfoen7d5cit6vptfi.apps.googleusercontent.com";

export default function GoogleAuthButton(_: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const initializedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const clientId = useMemo(
    () => (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID).trim(),
    [],
  );
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

  // Initialize Google GIS once and keep the credential callback stable.
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
          if (!credential) {
            toast.error(t("auth.failed"));
            return;
          }

          setSigningIn(true);
          try {
            const response = await fetch(`${apiBaseUrl}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });

            if (!response.ok) throw new Error(`auth/google responded ${response.status}`);

            const payload = (await response.json()) as { token: string; user: AuthState["user"] };
            setAuthState({ token: payload.token, user: payload.user });
          } catch {
            // Don't surface raw backend errors to the user.
            toast.error(t("auth.failed"));
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
  }, [apiBaseUrl, clientId, t]);

  useEffect(() => {
    if (auth) return;
    if (!clientId) return;
    if (!buttonRef.current) return;

    let canceled = false;
    const render = async () => {
      while (!canceled && !window.google?.accounts?.id?.renderButton) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (canceled) return;
      const idApi = window.google?.accounts?.id;
      const parent = buttonRef.current;
      if (!idApi || !parent) return;

      parent.innerHTML = "";
      idApi.renderButton(parent, {
        theme: resolvedTheme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        // Google caps the button at 400px; fill the container up to that.
        width: Math.min(400, Math.max(200, parent.offsetWidth || 320)),
      });
    };

    void render();
    return () => {
      canceled = true;
    };
  }, [auth, clientId, resolvedTheme]);

  // Signed-in state is shown by UserMenu in the header.
  if (auth) return null;

  if (!clientId) {
    return (
      <Button variant="outline" className="w-full" disabled>
        {t("auth.notConfigured")}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Reserve the button's height so the layout doesn't jump while Google's script loads. */}
      <div
        ref={buttonRef}
        className={`flex min-h-10 w-full max-w-[400px] justify-center [color-scheme:normal] ${signingIn ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={signingIn}
      />
      {signingIn ? <span className="text-xs text-muted-foreground" role="status">{t("auth.signingIn")}</span> : null}
    </div>
  );
}
