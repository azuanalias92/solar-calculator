"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearAuthState, getAuthState, setAuthState, type AuthState } from "@/lib/auth";
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
          // #region debug-point C:google-callback
          fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"google-fetch-failure",runId:"pre-fix",hypothesisId:"C",location:"GoogleAuthButton.tsx:callback",msg:"[DEBUG] Google callback fired",data:{origin:window.location.origin,apiBaseUrl,credentialPresent:Boolean(credential),credentialLength:credential?.length ?? 0},ts:Date.now()})}).catch(()=>{});
          // #endregion
          if (!credential) {
            toast.error(t("auth.failed"));
            return;
          }

          setSigningIn(true);
          try {
            // #region debug-point B:request-start
            fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"google-fetch-failure",runId:"pre-fix",hypothesisId:"B",location:"GoogleAuthButton.tsx:fetch-start",msg:"[DEBUG] Starting auth exchange",data:{origin:window.location.origin,url:`${apiBaseUrl}/auth/google`},ts:Date.now()})}).catch(()=>{});
            // #endregion
            const response = await fetch(`${apiBaseUrl}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });

            // #region debug-point D:response
            fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"google-fetch-failure",runId:"pre-fix",hypothesisId:"D",location:"GoogleAuthButton.tsx:fetch-response",msg:"[DEBUG] Auth exchange responded",data:{ok:response.ok,status:response.status,statusText:response.statusText,type:response.type,url:response.url},ts:Date.now()})}).catch(()=>{});
            // #endregion

            if (!response.ok) {
              const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
              throw new Error(errorPayload?.error ?? t("auth.failed"));
            }

            const payload = (await response.json()) as { token: string; user: AuthState["user"] };
            setAuthState({ token: payload.token, user: payload.user });
          } catch (error) {
            // #region debug-point D:fetch-error
            fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"google-fetch-failure",runId:"pre-fix",hypothesisId:"D",location:"GoogleAuthButton.tsx:catch",msg:"[DEBUG] Auth exchange threw",data:{name:error instanceof Error ? error.name : typeof error,message:error instanceof Error ? error.message : String(error),origin:window.location.origin,url:`${apiBaseUrl}/auth/google`},ts:Date.now()})}).catch(()=>{});
            // #endregion
            toast.error(error instanceof Error ? error.message : t("auth.failed"));
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

      // #region debug-point E:render-button
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"google-fetch-failure",runId:"post-fix",hypothesisId:"E",location:"GoogleAuthButton.tsx:render-button",msg:"[DEBUG] Rendering Google button instead of prompt",data:{origin:window.location.origin,clientIdPresent:Boolean(clientId)},ts:Date.now()})}).catch(()=>{});
      // #endregion
      parent.innerHTML = "";
      idApi.renderButton(parent, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
        width: 240,
      });
    };

    void render();
    return () => {
      canceled = true;
    };
  }, [auth, clientId]);

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
          {t("auth.logout")}
        </Button>
      </div>
    );
  }

  if (!clientId) {
    return (
      <Button variant="outline" size="sm" disabled>
        {t("auth.login")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={buttonRef} className={signingIn ? "pointer-events-none opacity-70" : ""} />
      {signingIn ? <span className="text-xs text-muted-foreground">{t("auth.signingIn")}</span> : null}
    </div>
  );
}
