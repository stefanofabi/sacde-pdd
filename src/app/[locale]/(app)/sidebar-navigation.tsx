
'use client';

import Link from 'next/link';
import { usePathname as useNextPathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3, UserCog } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';

export function SidebarNavigation() {
    const nextPathname = useNextPathname();
    const locale = useLocale();
    
    // Remove locale prefix from pathname to get the base path
    const pathname = nextPathname.startsWith(`/${locale}`) 
        ? nextPathname.substring(`/${locale}`.length) || '/' 
        : nextPathname;

    const t = useTranslations('Sidebar');
    const { user } = useAuth();

    const isActive = (path: string) => {
        // Handle root path separately
        if (path === '/') return pathname === path;
        // Check if the current path starts with the link's path
        return pathname.startsWith(path);
    };

    const allNavItems = [
      { href: "/cuadrillas", icon: Users, translationKey: "crews", roles: ['admin', 'crew_manager'] },
      { href: "/empleados", icon: IdCard, translationKey: "employees", roles: ['admin'] },
      { href: "/usuarios", icon: UserCog, translationKey: "users", roles: ['admin'] },
      { href: "/asistencias", icon: CalendarClock, translationKey: "attendance", roles: ['admin', 'foreman', 'tallyman', 'project_manager', 'management_control'] },
      { href: "/partes-diarios", icon: ClipboardList, translationKey: "dailyReports", roles: ['admin', 'foreman', 'tallyman', 'project_manager', 'management_control'] },
      { href: "/obras", icon: Briefcase, translationKey: "projects", roles: ['admin'] },
      { href: "/estadisticas", icon: BarChart3, translationKey: "statistics", roles: ['admin'] },
      { href: "/permisos", icon: UserCheck, translationKey: "permissions", roles: ['admin'] },
      { href: "/ajustes", icon: Settings, translationKey: "settings", roles: ['admin'] },
    ];
    
    const navItems = allNavItems.filter(item => user?.role && item.roles.includes(user.role));

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
