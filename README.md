# Solar Panel Estimator

A comprehensive solar panel calculator that helps you estimate your solar energy needs and potential savings. This web application provides accurate calculations for solar panel requirements based on your energy consumption, location, and system preferences.

## Features

- **Energy Consumption Calculator**: Input your monthly electricity usage to determine your energy needs
- **Solar Panel Estimation**: Calculate the number of solar panels required for your home
- **Cost Analysis**: Estimate installation costs and potential savings
- **Multi-language Support**: Available in English and Malay
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

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
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
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   └── LanguageSwitcher.tsx
├── lib/               # Utility functions
│   ├── pdfExport.ts   # PDF generation logic
│   ├── useTranslation.ts # Translation hook
│   └── utils.ts       # General utilities
├── locales/           # Translation files
│   ├── en.json        # English translations
│   └── ms.json        # Malay translations
└── middleware.ts      # Next.js middleware for i18n
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
