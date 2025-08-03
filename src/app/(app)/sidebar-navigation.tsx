
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, CalendarClock, Users, IdCard, UserCheck, ClipboardList, Settings, BarChart3, UserCog, LayoutDashboard, UserCircle } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import type { PermissionKey } from '@/types';

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, permissionKey: "dashboard" as PermissionKey, label: "Dashboard" },
  { href: "/cuadrillas", icon: Users, permissionKey: "crews" as PermissionKey, label: "Cuadrillas" },
  { href: "/empleados", icon: IdCard, permissionKey: "employees" as PermissionKey, label: "Empleados" },
  { href: "/usuarios", icon: UserCog, permissionKey: "users" as PermissionKey, label: "Usuarios" },
  { href: "/asistencias", icon: CalendarClock, permissionKey: "attendance" as PermissionKey, label: "Asistencias" },
  { href: "/partes-diarios", icon: ClipboardList, permissionKey: "dailyReports" as PermissionKey, label: "Partes Diarios" },
  { href: "/estadisticas", icon: BarChart3, permissionKey: "statistics" as PermissionKey, label: "Estadísticas" },
  { href: "/gestion-de-ausentismos", icon: UserCheck, permissionKey: "permissions" as PermissionKey, label: "Gestión de Ausentismos" },
  { href: "/perfil", icon: UserCircle, permissionKey: "dashboard" as PermissionKey, label: "Mi Perfil" },
  { href: "/ajustes", icon: Settings, permissionKey: "settings" as PermissionKey, label: "Ajustes" },
];

export function SidebarNavigation() {
    const pathname = usePathname();
    const { user } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') return pathname === path;
        if (path === '/dashboard') return pathname === path;
        if (path === '/perfil') return pathname === path;
        return pathname.startsWith(path) && path !== '/';
    };
    
    const userPermissions = user?.role?.permissions || [];
    
    const navItems = user?.is_superuser 
        ? allNavItems
        : allNavItems.filter(item => {
            if (item.href === '/perfil') return true; // All users can see their profile
            return userPermissions.includes(item.permissionKey)
        });

    return (
        <SidebarMenu className="mt-4 gap-y-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={isActive(item.href)}>
                    <item.icon />
                    {item.label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
    );
}
