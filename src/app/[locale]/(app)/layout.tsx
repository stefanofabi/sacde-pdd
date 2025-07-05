'use client';

import * as React from 'react';
import { Link } from 'next-intl/navigation';
import Image from 'next/image';

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
      <Sidebar variant="floating">
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center px-4">
             {/* Logo for expanded sidebar */}
             <Link href="/" className="w-full group-data-[collapsible=icon]:hidden">
                <Image 
                    src="/logo.png" 
                    alt="Sacde Logo" 
                    width={180} 
                    height={45} 
                    className="h-auto w-full"
                    priority
                />
             </Link>
             {/* Icon for collapsed sidebar */}
             <Link href="/" className="hidden h-10 w-10 items-center justify-center group-data-[collapsible=icon]:flex">
                 <Image 
                    src="/logo.png" 
                    alt="Sacde Icon" 
                    width={32} 
                    height={32}
                    style={{ objectFit: 'contain' }}
                />
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
