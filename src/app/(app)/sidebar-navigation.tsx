
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3, UserCog } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';

export function SidebarNavigation() {
    const pathname = usePathname();
    const { user } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') return pathname === path;
        return pathname.startsWith(path);
    };

    const navItemsMap = {
      crews: "Cuadrillas",
      employees: "Empleados",
      users: "Usuarios",
      attendance: "Asistencias",
      dailyReports: "Partes Diarios",
      projects: "Obras",
      permissions: "Permisos",
      settings: "Ajustes",
      statistics: "Estadísticas",
      logout: "Cerrar Sesión"
    };

    const allNavItems = [
      { href: "/cuadrillas", icon: Users, translationKey: "crews", roles: ['admin', 'crew_manager'] },
      { href: "/empleados", icon: IdCard, translationKey: "employees", roles: ['admin', 'recursos_humanos'] },
      { href: "/usuarios", icon: UserCog, translationKey: "users", roles: ['admin'] },
      { href: "/asistencias", icon: CalendarClock, translationKey: "attendance", roles: ['admin', 'foreman', 'tallyman', 'project_manager', 'management_control'] },
      { href: "/partes-diarios", icon: ClipboardList, translationKey: "dailyReports", roles: ['admin', 'foreman', 'tallyman', 'project_manager', 'management_control'] },
      { href: "/obras", icon: Briefcase, translationKey: "projects", roles: ['admin'] },
      { href: "/estadisticas", icon: BarChart3, translationKey: "statistics", roles: ['admin', 'recursos_humanos'] },
      { href: "/permisos", icon: UserCheck, translationKey: "permissions", roles: ['admin', 'recursos_humanos'] },
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
                    {navItemsMap[item.translationKey as keyof typeof navItemsMap]}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
    );
}
