
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

function DebugAuthPanel() {
  const { firebaseUser, user } = useAuth();
  
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-card border-2 border-destructive rounded-lg p-4 shadow-lg max-w-sm w-full text-xs">
        <h3 className="font-bold text-base mb-2 text-destructive">Debug Info</h3>
        <div>
          <p className="font-semibold">Firebase User (Auth):</p>
          <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
            {JSON.stringify(firebaseUser, null, 2) || 'null'}
          </pre>
        </div>
        <div className="mt-2">
          <p className="font-semibold">App User (Firestore):</p>
          <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
            {JSON.stringify(user, null, 2) || 'null'}
          </pre>
        </div>
      </div>
    );
  }
  
  return null;
}

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
        <DebugAuthPanel />
      </div>
    );
  }
  
  if (user) {
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
          <DebugAuthPanel />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <DebugAuthPanel />
      </div>
  );
}
