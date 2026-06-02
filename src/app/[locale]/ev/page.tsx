"use client";

import { useEffect } from "react";
import { useParams, redirect } from "next/navigation";

export default function EvRedirect() {
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    redirect(`/${locale}`);
  }, [locale]);

  return null;
}
