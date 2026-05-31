"use client";

import { useEffect } from "react";
import { useParams, redirect } from "next/navigation";

export default function RatesRedirect() {
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Redirect to settings page where tariff rates are now displayed
    redirect(`/${locale}/settings`);
  }, [locale]);

  return null;
}
