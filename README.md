# Kira Solar

A solar calculator + utility billing toolkit (Next.js frontend) backed by a Cloudflare Workers API (Hono + D1).

## Features

- **Solar Calculator**: Track appliances and estimate daily kWh + recommended solar panels
- **EV vs Non‑EV Usage**: Track monthly EV charging vs non‑EV usage (saved per-year)
- **Tariff Rates Viewer**: Preview current TNB tariff rates (as-of a selected date)
- **Google Login**: Sign in with Google (stores a session token client-side)
- **Backend Sync**: Saves calculator state and EV usage to the API when logged in
- **Multi-language Support**: English and Malay
- **PDF Export**: Generate detailed reports of your solar calculations
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Pages

- `/ms` or `/en`: Solar calculator
- `/ms/bill-ev` or `/en/bill-ev`: EV vs Non‑EV monthly usage
- `/ms/rates` or `/en/rates`: Tariff rate preview (calls the backend)

## Environment Variables

Create `/Users/azuanalias/Desktop/Personal/solar-calculator/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

Restart `npm run dev` after changing env vars.

## Backend API

The frontend expects the API to expose:

- `POST /auth/google` (exchange Google ID token for session token)
- `GET/PUT /calculator/state` (store the calculator state)
- `GET/PUT /ev-usage` and `GET /ev-usage/years` (EV usage by year)
- `GET /tariff-rates` (rate preview)
- `GET /docs` (Swagger UI)

## Technology Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **PDF Generation**: jsPDF with AutoTable
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics and Speed Insights

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   └── [locale]/       # Internationalized routes
│       ├── bill-ev/     # EV usage tracker
│       └── rates/       # Tariff rates preview
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   ├── GoogleAuthButton.tsx
│   └── LanguageSwitcher.tsx
├── lib/               # Utility functions
│   ├── auth.ts        # Client auth storage helpers
│   ├── pdfExport.ts   # PDF generation logic
│   ├── useTranslation.ts # Translation hook
│   └── utils.ts       # General utilities
├── locales/           # Translation files
│   ├── en.json        # English translations
│   └── ms.json        # Malay translations
├── proxy.ts           # Locale routing proxy helper
```

## Internationalization

The application supports multiple languages:
- English (en)
- Malay (ms)

Language files are located in the `src/locales/` directory.

## Building for Production

```bash
npm run build
npm run start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
