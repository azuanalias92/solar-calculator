# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Kira Solar (https://kirasolar.my) is a Malaysian solar / electricity toolkit: a solar panel calculator, an EV charging vs non-EV usage tracker, and a TNB tariff viewer. This repo is the **Next.js frontend only**. The API is a separate Cloudflare Workers service (Hono + D1). Don't try to implement backend endpoints here. The one exception is `src/app/api/auth/google/route.ts`, a thin bridge for Google's redirect sign-in that forwards the token to the API.

## Commands

```bash
npm install        # Node 22 (see .nvmrc); .npmrc pins the public npm registry
npm run dev        # http://localhost:3000
npm run lint       # ESLint (eslint-config-next)
npm run build      # production build, which also type-checks
```

There is no test suite. Before you finish, run `npm run lint` and `npm run build` and make sure both pass.

Environment (`.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787   # defaults to this when unset
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_SITE_VERIFICATION=...                      # optional
```

## Stack

- Next.js 16 (App Router), React 19, TypeScript, using the `@/*` → `src/*` path alias
- Tailwind CSS 3 with shadcn/ui ("new-york" style) on Radix primitives, in `src/components/ui/`
- react-hook-form + zod 4, recharts, lucide-react, sonner toasts, next-themes
- jsPDF (**pinned to 3.0.4**, so don't bump it) + jspdf-autotable for PDF export
- Deployed on Vercel with Vercel Analytics and Speed Insights

## Layout

```
src/
├── app/
│   ├── layout.tsx              # root layout, service worker registration, global metadata
│   └── [locale]/               # every user-facing route is locale-prefixed (en | ms)
│       ├── page.tsx            # dashboard (EV usage, daily usage, charging sessions)
│       ├── solar-calculator/   # appliance list → daily kWh → panel recommendation
│       ├── ev-calculator/
│       ├── settings/           # tariff selection and rates
│       ├── items/form.tsx      # appliance form (dynamically imported, ssr: false)
│       └── bill-ev, ev, usage, rates/   # legacy routes that only redirect; keep them
├── components/
│   ├── ui/                     # shadcn primitives; prefer extending these over new ones
│   └── dashboard/              # dashboard sections plus shared types/utils
├── lib/
│   ├── auth.ts                 # localStorage auth state ("kirasolar.auth") and 401 handling
│   ├── useTranslation.ts       # t("a.b.c") hook with English fallback
│   └── pdfExport.ts
├── locales/{en,ms}.json        # translation strings
└── proxy.ts                    # locale redirect (Next 16 "proxy", formerly middleware)
public/                         # PWA manifest, sw.js, sitemaps, OG images, robots.txt
```

## Conventions

### i18n
- **Never hardcode user-facing strings.** Add the key to **both** `src/locales/en.json` and `src/locales/ms.json`, then use `t("section.key")`.
- Malay (`ms`) is the default locale. Links must keep the current locale prefix (`/${locale}/...`).
- `proxy.ts` resolves the locale from the URL, then the `preferred_lang` cookie, then `Accept-Language`.

### Data and auth
- Pages are client components (`"use client"`) that call the API directly with `fetch(\`${apiBaseUrl}/...\`)` and a `Bearer` token from `getAuthState()`.
- After a failed request, always pass the response to `handleAuthFailure(res)` so a 401 clears the stale session.
- Signed-out users keep working with local state. Signed-in users sync to the API with **debounced, silent background saves**: no toasts, badges or spinners for routine sync. Show toasts only for real errors.
- Never put the API URL or raw backend errors in UI messages.
- Google sign-in uses GIS **redirect mode** (no popups, which browsers and installed PWAs block). The button posts to `/api/auth/google`, which checks a nonce cookie against the ID token and returns a small page whose script calls the API's `POST /auth/google` **from the browser**, writes `kirasolar.auth` to localStorage and returns the user to where they started. Keep that exchange in the browser: the API rate-limits `/auth/*` to 20 requests per 15 minutes per IP, and calling it from the server would put every user behind Vercel's shared IPs. Failures come back as `?auth=failed`. One Tap still uses the JS `callback`. Every origin's `/api/auth/google` must be listed under **Authorized redirect URIs** for the OAuth client in Google Cloud Console.
- Endpoints used: `POST /auth/google`, `GET/PUT /calculator/state`, `GET/PUT /ev-usage`, `GET /ev-usage/years`, `GET/PUT /daily-usage`, `GET /daily-usage/summary`, `GET /daily-usage/years`, `GET /tariff-rates`, `GET /afa-rates`, `GET/POST /ev-sessions`, `GET /notes` (legacy import record). The full list is at `${API}/openapi.json`.
- Charging sessions are stored by the API (`GET/POST /ev-sessions`, keyed by start date and time). `POST` skips sessions it already has and adds only new sessions' kWh to the monthly EV totals in the same transaction, so saving the same statement twice is safe. Use `src/lib/evSessions.ts`; don't add kWh to `/ev-usage` yourself. Hidden notes titled `kirasolar:ev-sessions:<year>` are read-only legacy records of sessions counted before sessions were stored; they're sent as `alreadyCounted` so their kWh isn't added again.
- Bill estimates come from the API (`/daily-usage/summary`), which applies TNB's domestic rules and each month's AFA rate (synced daily from myTNB). Don't recalculate bills in the frontend; show what the API returns, including `afaRate` and `afaEstimated`.
- Daily usage imports are sent in 31-day chunks (`PUT /daily-usage` upserts, so re-sending is safe). The API also rate-limits every route to 100 requests per minute per IP.
- myTNB daily usage CSVs are parsed by `src/lib/tnbCsv.ts` (header-based columns, several date formats). Keep new import formats there, not in components.

### Security headers
- `next.config.mjs` defines a strict CSP. If you add a third-party script, image host or API origin, update the matching CSP directive (`script-src`, `img-src`, `connect-src`, and so on), or the browser will block it in production.

### UI, design and accessibility
- Mobile-first. Recent work favours full-width buttons on mobile and an iOS-style floating bottom nav (`MobileNav`). Check every change at phone width.
- Support both light and dark mode, and use theme CSS variables and Tailwind tokens rather than hardcoded colours.
- `Design.md` holds the target design system (Supabase-inspired: green accent used sparingly, borders instead of shadows, small radii). Follow it for new UI.
- Keep the accessibility work intact: the skip link, the `<main>` landmark, labelled controls, sufficient colour contrast, and 44px touch targets.

### Performance and SEO
- Lazy-load heavy client-only modules (forms, PDF, charts) with `next/dynamic`. `optimizePackageImports` already covers recharts, lucide and Radix.
- Canonical URLs and `hreflang` alternates are set in `src/app/[locale]/layout.tsx` against `https://kirasolar.my`. Update `public/sitemap*.xml` when you add a page.
- If you change cached static assets in `public/sw.js`, bump `CACHE_NAME`.

### Code style
- TypeScript, functional components and hooks. Use `cn()` from `@/lib/utils` to merge class names.
- Match the formatting of the surrounding file (quote and semicolon style varies between files).
- Keep changes focused. Don't reformat unrelated code.

## Commits

Use Conventional Commit style, as in the existing history: `feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, `ux:`, `security:`, combined with `+` when a commit spans several areas (for example `perf+seo+a11y: ...`). Write a short, lowercase summary of what changed.
