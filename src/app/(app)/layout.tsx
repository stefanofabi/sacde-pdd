
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Briefcase, CalendarClock, Users } from 'lucide-react';

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
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center">
             {/* Logo for expanded sidebar */}
             <div className="w-full rounded-md bg-white p-2 mx-2 group-data-[collapsible=icon]:hidden">
                <Image 
                    src="/logo.png" 
                    alt="Sacde Logo" 
                    width={180} 
                    height={45} 
                    className="h-auto w-full"
                    priority
                />
             </div>
             {/* Icon for collapsed sidebar */}
             <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-white p-1 group-data-[collapsible=icon]:flex">
                 <Image 
                    src="/logo.png" 
                    alt="Sacde Icon" 
                    width={32} 
                    height={32}
                    style={{ objectFit: 'contain' }}
                />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/asistencias">
                <SidebarMenuButton isActive={isActive('/asistencias')}>
                  <CalendarClock />
                  Asistencias
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/cuadrillas">
                <SidebarMenuButton isActive={isActive('/cuadrillas')}>
                  <Users />
                  Cuadrillas
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/obras">
                <SidebarMenuButton isActive={isActive('/obras')}>
                  <Briefcase />
                  Obras
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex w-full justify-center">
            <SidebarTrigger />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
