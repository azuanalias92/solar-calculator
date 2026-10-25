"use client";

import Image from "next/image";
import { CloudOff, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { signOut, type AuthState } from "@/lib/auth";
import { useTranslation } from "@/lib/useTranslation";

export default function AccountCard({ auth, locale }: { auth: AuthState | null; locale: string }) {
  const { t } = useTranslation();

  if (!auth?.token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
          <CardDescription>{t("settings.signInPrompt")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
              <CloudOff className="h-4 w-4" aria-hidden />
            </span>
            {t("settings.notSignedIn")}
          </div>
          <div className="w-full sm:w-72">
            <GoogleAuthButton locale={locale} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { user } = auth;
  const name = user.name ?? t("settings.defaultUsername");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.account")}</CardTitle>
        <CardDescription>{t("settings.accountSignedInDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {user.picture ? (
            <Image src={user.picture} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full border" unoptimized />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-primary/10 text-lg font-medium uppercase text-link">
              {name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{name}</p>
              <Badge className="shrink-0">{t("settings.synced")}</Badge>
            </div>
            {user.email ? <p className="truncate text-sm text-muted-foreground">{user.email}</p> : null}
          </div>
        </div>
        <Button
          variant="destructive"
          className="w-full sm:w-auto"
          onClick={() => {
            signOut();
            toast.success(t("auth.signedOut"));
          }}
        >
          <LogOut />
          {t("auth.logout")}
        </Button>
      </CardContent>
    </Card>
  );
}
