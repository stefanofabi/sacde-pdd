
'use client';

import { Link } from 'next-intl/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { SidebarNavigation } from './sidebar-navigation';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut, Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Sidebar');

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isAuthenticated, loading, router, locale]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center px-4">
             <Link href="/" className="w-full group-data-[collapsible=icon]:hidden">
                <div 
                    data-ai-hint="logo company"
                    className="w-[180px] h-[45px] bg-muted rounded flex items-center justify-center text-muted-foreground"
                >
                    Logo
                </div>
             </Link>
             <Link href="/" className="hidden h-10 w-10 items-center justify-center group-data-[collapsible=icon]:flex">
                 <div 
                    data-ai-hint="logo company"
                    className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs"
                 >
                    L
                 </div>
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavigation />
        </SidebarContent>
        <SidebarFooter className="flex-col gap-2 p-2">
            <div className="text-center text-xs text-sidebar-foreground/70 mb-2 group-data-[collapsible=icon]:hidden">
              {user?.email}
            </div>
            <Button variant="ghost" onClick={logout} className="w-full justify-start gap-2">
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">{t('logout')}</span>
            </Button>
            <div className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:flex-col">
                <LanguageToggle />
                <ThemeToggle />
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
