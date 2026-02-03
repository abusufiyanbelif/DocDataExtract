'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { useUser } from '@/firebase';

function RedirectLoader({ message }: { message: string }) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-xs text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();

  const isLoginPage = pathname === '/login';
  const isSeedPage = pathname === '/seed';
  const isPublicCampaignPath = pathname.startsWith('/campaign-public');
  const isHomePage = pathname === '/';
  
  const isPublicRoute = isLoginPage || isPublicCampaignPath || isHomePage || isSeedPage;

  // Redirect authenticated users from login page
  useEffect(() => {
    if (isLoginPage && !isLoading && user) {
        router.push('/');
    }
  }, [isLoginPage, isLoading, user, router]);
  
  // Redirect unauthenticated users from private pages
  useEffect(() => {
      if (!isPublicRoute && !isLoading && !user) {
          router.push('/login');
      }
  }, [isPublicRoute, isLoading, user, router]);

  // Show a loader while authenticating on private routes, or redirecting from login
  if ((!isPublicRoute && (isLoading || !user)) || (isLoginPage && (isLoading || user))) {
      return <RedirectLoader message="Authenticating..." />;
  }
  
  // Provide session to all pages
  return (
    <SessionProvider authUser={user}>
        {children}
    </SessionProvider>
  );
}
