'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { NextIntlClientProvider } from 'next-intl';

export function Providers({ 
  children, 
  locale, 
  messages 
}: { 
  children: React.ReactNode, 
  locale: string, 
  messages: any 
}) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </AuthProvider>
        </NextIntlClientProvider>
    );
}
