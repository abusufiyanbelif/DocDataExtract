'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { useUser } from '@/firebase';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseContentWrapper } from './FirebaseContentWrapper';

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
  
  const isPublicRoute = isPublicCampaignPath || isHomePage || isSeedPage;

  // Handle redirect for login page
  useEffect(() => {
    if (isLoginPage && !isLoading && user) {
        router.push('/');
    }
  }, [isLoginPage, isLoading, user, router]);

  if (isLoginPage) {
      if (isLoading || user) {
          return <RedirectLoader message="Redirecting..." />;
      }
      // Render login page without the full provider wrapper if needed, but for now this is fine
      return (
        <div className="app-root">
            {children}
            <AppFooter />
            <Toaster />
        </div>
      );
  }

  // Handle redirect for private routes
  useEffect(() => {
      if (!isPublicRoute && !isLoading && !user) {
          router.push('/login');
      }
  }, [isPublicRoute, isLoading, user, router]);

  if (!isPublicRoute && (isLoading || !user)) {
      return <RedirectLoader message="Authenticating..." />;
  }

  // For both public and authenticated private routes, render the main content with all providers
  return (
    <SessionProvider authUser={user}>
        <FirebaseContentWrapper>
            <div className="app-root">
                {children}
                <AppFooter />
            </div>
            <Toaster />
        </FirebaseContentWrapper>
    </SessionProvider>
  );
}
