import { NextRequest, NextResponse } from "next/server";

/**
 * Google Sign-In redirect target (GIS `ux_mode: "redirect"`).
 *
 * Google POSTs the ID token here as a form, so sign-in works without popups in every
 * browser. After checking the nonce, we hand the token to the browser, which exchanges it
 * with the API itself, stores the session the same way the popup flow does
 * (localStorage "kirasolar.auth") and returns the user to where they were.
 *
 * The exchange must run in the browser: the API rate-limits /auth/* per client IP, and
 * calling it from here would put every user behind Vercel's few shared IPs.
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

  // Escape "<" so the values can't close the script tag.
  const js = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
  const script = `(function(){var ret=${js(returnPath)};function fail(){var u=new URL(ret,location.origin);u.searchParams.set("auth","failed");location.replace(u.toString());}fetch(${js(`${API_BASE_URL}/auth/google`)},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:${js(credential)}})}).then(function(r){return r.ok?r.json():null}).then(function(s){if(!s||typeof s.token!=="string")return fail();try{localStorage.setItem("kirasolar.auth",JSON.stringify({token:s.token,user:s.user}))}catch(e){}location.replace(ret);}).catch(fail);})();`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Kira Solar</title></head><body><script>${script}</script></body></html>`;

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
