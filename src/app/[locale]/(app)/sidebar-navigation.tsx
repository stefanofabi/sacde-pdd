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

    const navItems = [
      { href: "/cuadrillas", icon: Users, translationKey: "crews" },
      { href: "/empleados", icon: IdCard, translationKey: "employees" },
      { href: "/asistencias", icon: CalendarClock, translationKey: "attendance" },
      { href: "/partes-diarios", icon: ClipboardList, translationKey: "dailyReports" },
      { href: "/obras", icon: Briefcase, translationKey: "projects" },
      { href: "/estadisticas", icon: BarChart3, translationKey: "statistics" },
      { href: "/permisos", icon: UserCheck, translationKey: "permissions" },
      { href: "/ajustes", icon: Settings, translationKey: "settings" },
    ];

    return (
        <SidebarMenu className="mt-4 gap-y-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={isActive(item.href)}>
                    <item.icon />
                    {t(item.translationKey)}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
    );
}
