# Kira Solar

A solar calculator and electricity tracking toolkit for Malaysian households — live at [kirasolar.my](https://kirasolar.my).

This repo is the Next.js frontend. It talks to a separate Cloudflare Workers API (Hono + D1).

## Features

- **Dashboard**: Track monthly EV charging vs non‑EV usage (saved per year), daily usage via CSV upload, and charging sessions
- **Solar Calculator**: Add appliances to estimate daily kWh and get a recommended solar panel setup
- **EV Charging Cost Calculator**: Estimate charging cost from battery capacity, charge levels, and rate, with quick presets
- **Settings & Tariffs**: Choose a tariff and preview current TNB rates (as of a selected date)
- **Google Login**: Sign in with Google; data syncs to the API in the background when logged in
- **PDF Export**: Generate detailed reports of your solar calculations
- **Bilingual**: Bahasa Malaysia (default) and English
- **PWA**: Installable, with a service worker for offline support
- **Responsive, Light/Dark Mode**: Mobile-first layout with a floating bottom nav on phones

## Getting Started

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_SITE_VERIFICATION=        # optional
```

Restart `npm run dev` after changing env vars.

### Google Sign-In

Sign-in uses Google's redirect flow, so it works in every browser without popups. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), the OAuth client must list each origin under **Authorized JavaScript origins** and its `/api/auth/google` URL under **Authorized redirect URIs**, for example:

- `https://kirasolar.my` and `https://kirasolar.my/api/auth/google`
- `http://localhost:3000` and `http://localhost:3000/api/auth/google`

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | Run ESLint |
| `npm run build` | Production build (includes type-checking) |
| `npm run start` | Serve the production build |

## Pages

All routes are locale-prefixed (`/ms/...` or `/en/...`). Visiting `/` redirects based on your saved preference or browser language.

| Route | Page |
| --- | --- |
| `/{locale}` | Dashboard |
| `/{locale}/solar-calculator` | Solar calculator |
| `/{locale}/ev-calculator` | EV charging cost calculator |
| `/{locale}/settings` | Tariff settings and rates |

Legacy routes (`/bill-ev`, `/ev`, `/usage`, `/rates`) redirect to their current equivalents.

## Backend API

The frontend expects the API to expose:

- `POST /auth/google` — exchange a Google ID token for a session token
- `GET/PUT /calculator/state` — store the calculator state
- `GET/PUT /ev-usage` and `GET /ev-usage/years` — EV usage by year
- `GET /tariff-rates` — rate preview
- `GET /docs` — Swagger UI

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui on Radix UI primitives, next-themes
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **PDF Generation**: jsPDF with AutoTable
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Analytics**: Vercel Analytics and Speed Insights

## Project Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout, metadata, service worker
│   └── [locale]/             # Internationalized routes
│       ├── page.tsx          # Dashboard
│       ├── solar-calculator/
│       ├── ev-calculator/
│       ├── settings/
│       └── items/            # Appliance form
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard/            # Dashboard sections
│   └── ...                   # Header, nav, footer, auth button, etc.
├── lib/
│   ├── auth.ts               # Client auth storage helpers
│   ├── pdfExport.ts          # PDF generation
│   ├── useTranslation.ts     # Translation hook
│   └── utils.ts
├── locales/                  # en.json, ms.json
└── proxy.ts                  # Locale routing
public/                       # PWA manifest, service worker, sitemaps, OG images
```

## Internationalization

Translations live in `src/locales/en.json` and `src/locales/ms.json`. Add new keys to both files and use them via `t("section.key")` from `useTranslation`. Missing keys fall back to English.

## Deployment

Deployed on [Vercel](https://vercel.com). Security headers (including CSP) are configured in `next.config.mjs` — update the CSP when adding new external origins.

## Contributing

Contributions are welcome! Please open a Pull Request. AI coding agents should read [AGENTS.md](AGENTS.md).

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.
