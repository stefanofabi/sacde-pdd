'use client';

import { Link } from 'next-intl/navigation';
import * as React from 'react';

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center px-4">
             {/* Logo for expanded sidebar */}
             <Link href="/" className="w-full group-data-[collapsible=icon]:hidden">
                <div 
                    data-ai-hint="logo company"
                    className="w-[180px] h-[45px] bg-muted rounded flex items-center justify-center text-muted-foreground"
                >
                    Logo
                </div>
             </Link>
             {/* Icon for collapsed sidebar */}
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
            <div className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:flex-col">
                <LanguageToggle />
                <ThemeToggle />
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
