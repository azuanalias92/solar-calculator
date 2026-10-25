import { NextRequest, NextResponse } from "next/server";

/**
 * Google Sign-In redirect target (GIS `ux_mode: "redirect"`).
 *
 * Google POSTs the ID token here as a form, so sign-in works without popups in every
 * browser. We exchange it with the API, then hand the session to the client the same way
 * the popup flow does (localStorage "kirasolar.auth") and send the user back where they were.
 */

export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
const NONCE_COOKIE = "kirasolar_oauth_nonce";
const RETURN_COOKIE = "kirasolar_oauth_return";
const LOCALES = ["en", "ms"];

/** Only allow same-site paths like "/ms/settings"; anything else falls back to the dashboard. */
function safeReturnPath(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    const locale = value.split("/")[1];
    if (LOCALES.includes(locale)) return value;
  }
  return "/ms";
}

/** Reads the `nonce` claim without verifying the token; the API verifies the signature. */
function nonceFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { nonce?: unknown };
    return typeof json.nonce === "string" ? json.nonce : null;
  } catch {
    return null;
  }
}

function clearOauthCookies(response: NextResponse) {
  response.cookies.delete(NONCE_COOKIE);
  response.cookies.delete(RETURN_COOKIE);
  return response;
}

function fail(request: NextRequest, returnPath: string) {
  const url = new URL(returnPath, request.url);
  url.searchParams.set("auth", "failed");
  return clearOauthCookies(NextResponse.redirect(url, 303));
}

export async function POST(request: NextRequest) {
  const returnPath = safeReturnPath(request.cookies.get(RETURN_COOKIE)?.value);

  const form = await request.formData().catch(() => null);
  const credential = form?.get("credential");
  if (typeof credential !== "string" || !credential) return fail(request, returnPath);

  // CSRF / login-forcing protection: the nonce we set in a cookie when rendering the
  // button must match the nonce Google embedded in the ID token.
  const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!expectedNonce || nonceFromIdToken(credential) !== expectedNonce) return fail(request, returnPath);

  let session: { token: string; user: unknown };
  try {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
      cache: "no-store",
    });
    if (!res.ok) return fail(request, returnPath);
    session = (await res.json()) as { token: string; user: unknown };
    if (typeof session?.token !== "string") return fail(request, returnPath);
  } catch {
    return fail(request, returnPath);
  }

  // Escape "<" so the JSON can't close the script tag.
  const authJson = JSON.stringify(JSON.stringify({ token: session.token, user: session.user })).replace(/</g, "\\u003c");
  const returnJson = JSON.stringify(returnPath).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Kira Solar</title></head><body><script>try{localStorage.setItem("kirasolar.auth",${authJson})}catch(e){}location.replace(${returnJson});</script></body></html>`;

  return clearOauthCookies(
    new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    }),
  );
}
