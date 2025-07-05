'use client';

import * as React from 'react';
import { usePathname } from 'next-intl/client';
import Link from 'next-intl/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

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
          <SidebarMenu className="mt-4 gap-y-2">
            <SidebarMenuItem>
              <Link href="/cuadrillas">
                <SidebarMenuButton isActive={isActive('/cuadrillas')}>
                  <Users />
                  {t('crews')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/empleados">
                <SidebarMenuButton isActive={isActive('/empleados')}>
                  <IdCard />
                  {t('employees')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/asistencias">
                <SidebarMenuButton isActive={isActive('/asistencias')}>
                  <CalendarClock />
                  {t('attendance')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/partes-diarios">
                <SidebarMenuButton isActive={isActive('/partes-diarios')}>
                  <ClipboardList />
                  {t('dailyReports')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/obras">
                <SidebarMenuButton isActive={isActive('/obras')}>
                  <Briefcase />
                  {t('projects')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/permisos">
                <SidebarMenuButton isActive={isActive('/permisos')}>
                  <UserCheck />
                  {t('permissions')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
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
