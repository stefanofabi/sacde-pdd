'use client';

import * as NextIntlNavigation from 'next-intl/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function SidebarNavigation() {
    const pathname = NextIntlNavigation.usePathname();
    const t = useTranslations('Sidebar');

    const isActive = (path: string) => {
        // The pathname returned by `usePathname` from `next-intl` is already locale-free
        const finalPathname = pathname === '' ? '/' : pathname;

        if (path === '/') return finalPathname === path;
        
        return finalPathname.startsWith(path);
    };

    return (
        <SidebarMenu className="mt-4 gap-y-2">
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/cuadrillas">
                <SidebarMenuButton isActive={isActive('/cuadrillas')}>
                  <Users />
                  {t('crews')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/empleados">
                <SidebarMenuButton isActive={isActive('/empleados')}>
                  <IdCard />
                  {t('employees')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/asistencias">
                <SidebarMenuButton isActive={isActive('/asistencias')}>
                  <CalendarClock />
                  {t('attendance')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/partes-diarios">
                <SidebarMenuButton isActive={isActive('/partes-diarios')}>
                  <ClipboardList />
                  {t('dailyReports')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/obras">
                <SidebarMenuButton isActive={isActive('/obras')}>
                  <Briefcase />
                  {t('projects')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <NextIntlNavigation.Link href="/estadisticas">
                <SidebarMenuButton isActive={isActive('/estadisticas')}>
                  <BarChart3 />
                  {t('statistics')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/permisos">
                <SidebarMenuButton isActive={isActive('/permisos')}>
                  <UserCheck />
                  {t('permissions')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NextIntlNavigation.Link href="/ajustes">
                <SidebarMenuButton isActive={isActive('/ajustes')}>
                  <Settings />
                  {t('settings')}
                </SidebarMenuButton>
              </NextIntlNavigation.Link>
            </SidebarMenuItem>
          </SidebarMenu>
    );
}
