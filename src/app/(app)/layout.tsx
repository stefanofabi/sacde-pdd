
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
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarNavigation } from './sidebar-navigation';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { getUserByEmail } from '@/app/actions';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser, user, setUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isUserDataLoading, setIsUserDataLoading] = React.useState(true);

  React.useEffect(() => {
    if (loading) {
      return; // Wait for Firebase auth state to be determined
    }

    if (!firebaseUser) {
      router.replace(`/login`);
      return;
    }
    
    // Firebase user exists, now fetch our app-specific user data
    if (firebaseUser && !user) {
        setIsUserDataLoading(true);
        getUserByEmail(firebaseUser.email!)
            .then(appUser => {
                setUser(appUser);
            })
            .catch(err => {
                console.error("Failed to fetch user data, logging out.", err);
                logout();
            })
            .finally(() => {
                setIsUserDataLoading(false);
            });
    } else {
        setIsUserDataLoading(false);
    }

  }, [firebaseUser, user, loading, router, setUser, logout]);

  if (loading || isUserDataLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = user?.email;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center px-4">
             <Link href={`/`} className="w-full group-data-[collapsible=icon]:hidden">
                <div 
                    data-ai-hint="logo company"
                    className="w-[180px] h-[45px] bg-muted rounded flex items-center justify-center text-muted-foreground"
                >
                    Logo
                </div>
             </Link>
             <Link href={`/`} className="hidden h-10 w-10 items-center justify-center group-data-[collapsible=icon]:flex">
                 <div 
                    data-ai-hint="logo company"
                    className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs"
                 >
                    L
                 </div>
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavigation />
        </SidebarContent>
        <SidebarFooter className="flex-col gap-2 p-2">
            <div className="text-center text-xs text-sidebar-foreground/70 mb-2 group-data-[collapsible=icon]:hidden truncate" title={displayName}>
              {displayName}
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
