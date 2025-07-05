import type {Metadata} from 'next';
import './globals.css';
import { NextIntlClientProvider, IntlErrorCode } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Parte Digital - Sacde',
  description: 'Plataforma de Parte Digital para Sacde',
};

// Providing a default is required because the compiler can't know that
// the parameter `locale` will always be a valid locale.
function onError(error: any) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    // Missing translations are expected and should not log an error
  } else {
    console.error(error);
  }
}

// Even though this component is rendered on the server, it's a good idea
// to abstract away the configuration since it needs to be provided to every
// page component that uses translations.
async function getMessagesForLocale(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error('Could not load messages for locale:', locale, error);
    // Return empty messages as a fallback
    return {};
  }
}

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = await getMessagesForLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} onError={onError}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
