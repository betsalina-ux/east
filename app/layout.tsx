import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { buildFaviconUri } from '@/lib/build-favicon-uri';
import { inter, FONT_CLASS_MAP } from '@/lib/fonts';
import { TemplateLayout } from '@/components/custom/template-layout';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';
import './globals.css';
import './custom.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const faviconUri = buildFaviconUri();

  return {
    title: 'ChartEye Trading App',
    description: 'ChartEye trading templates powered by Deriv',
    ...(faviconUri ? { icons: { icon: faviconUri } } : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const fontClass =
  FONT_CLASS_MAP[process.env.NEXT_PUBLIC_FONT_FAMILY ?? 'Inter'] ??
  inter.className;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="min-h-full overflow-x-hidden"
      suppressHydrationWarning
    >
      <body
  className={`${fontClass} ${ibmPlexSans.variable} min-h-screen w-full overflow-x-hidden overflow-y-auto bg-background text-foreground`}
>
        <TemplateLayout>
          {children}
        </TemplateLayout>
      </body>
    </html>
  );
}
