"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthState, signOut, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";

function Avatar({ user, size }: { user: AuthState["user"]; size: number }) {
  const label = user.name ?? user.email ?? "";
  if (user.picture) {
    return (
      <Image
        src={user.picture}
        alt=""
        width={size}
        height={size}
        className="rounded-full border"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full border bg-primary/10 text-sm font-medium uppercase text-link"
      style={{ width: size, height: size }}
    >
      {label.charAt(0) || "?"}
    </span>
  );
}

export default function UserMenu({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  // undefined until localStorage has been read, so signed-in users don't see a "Sign in" flash.
  const [auth, setAuth] = useState<AuthState | null | undefined>(undefined);

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

  if (auth === undefined) return <div className="h-10 w-10 shrink-0" aria-hidden />;

  if (!auth) {
    // The dashboard already shows the sign-in screen.
    if (pathname === `/${locale}`) return null;
    return (
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link href={`/${locale}`}>
          <LogIn />
          {t("auth.login")}
        </Link>
      </Button>
    );
  }

  const { user } = auth;
  const displayName = user.name ?? user.email ?? t("settings.defaultUsername");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={t("auth.accountMenu")}>
          <Avatar user={user} size={32} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <Avatar user={user} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm text-foreground">{displayName}</span>
            {user.email && user.email !== displayName ? (
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            ) : null}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/settings`}>
            <Settings />
            {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={() => {
            signOut();
            toast.success(t("auth.signedOut"));
          }}
        >
          <LogOut />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
