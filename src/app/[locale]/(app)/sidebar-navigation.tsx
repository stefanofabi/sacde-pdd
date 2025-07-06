'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function SidebarNavigation() {
    const fullPathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('Sidebar');

    // Manually remove the locale prefix to get the active path
    const pathname = fullPathname.startsWith(`/${locale}`)
        ? fullPathname.slice(`/${locale}`.length) || '/'
        : fullPathname;

    const isActive = (path: string) => {
        if (path === '/') return pathname === path;
        return pathname.startsWith(path);
    };

    return (
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
              <Link href="/estadisticas">
                <SidebarMenuButton isActive={isActive('/estadisticas')}>
                  <BarChart3 />
                  {t('statistics')}
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
            <SidebarMenuItem>
              <Link href="/ajustes">
                <SidebarMenuButton isActive={isActive('/ajustes')}>
                  <Settings />
                  {t('settings')}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
    );
}
