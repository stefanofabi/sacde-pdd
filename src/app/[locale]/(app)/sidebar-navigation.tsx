
'use client';

import { usePathname, Link } from 'next-intl/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';

export function SidebarNavigation() {
    const pathname = usePathname();
    const t = useTranslations('Sidebar');
    const { user } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') return pathname === path;
        return pathname.startsWith(path);
    };

    const allNavItems = [
      { href: "/cuadrillas", icon: Users, translationKey: "crews", roles: ['admin', 'crew_manager'] },
      { href: "/empleados", icon: IdCard, translationKey: "employees", roles: ['admin'] },
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
