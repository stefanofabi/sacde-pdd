
'use client';

import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarNavigation } from './sidebar-navigation';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user) {
    const displayName = user?.email;
    const roleName = user?.is_superuser ? "Superusuario" : user?.role?.name || "Sin Rol";
    const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

    return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex h-16 items-center justify-center px-4">
              <Link href={`/`} className="w-full group-data-[collapsible=icon]:hidden">
                  <Image
                      src="/logo.png"
                      alt="Company Logo"
                      width={180}
                      height={45}
                      className="object-contain"
                  />
              </Link>
              <Link href={`/`} className="hidden h-10 w-10 items-center justify-center group-data-[collapsible=icon]:flex">
                   <Image
                      src="/logo.png"
                      alt="Company Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                  />
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNavigation />
          </SidebarContent>
          <SidebarFooter className="flex-col gap-2 p-2">
              <div className="text-center space-y-2 mb-2 group-data-[collapsible=icon]:hidden">
                <Avatar className='mx-auto h-16 w-16 border-2 border-primary'>
                  <AvatarImage src={user.photoURL} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <p className="truncate text-sm font-medium" title={displayName}>{displayName}</p>
                <Badge variant="secondary" className="mt-1">{roleName}</Badge>
              </div>
              <Button variant="ghost" onClick={logout} className="w-full justify-start gap-2">
                <LogOut />
                <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
              </Button>
              <div className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:flex-col">
                  <ThemeToggle />
              </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <div className="md:hidden fixed top-2 left-2 z-50">
                <SidebarTrigger />
            </div>
            <div className="pt-12 md:pt-0">
                {children}
            </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return null;
}
