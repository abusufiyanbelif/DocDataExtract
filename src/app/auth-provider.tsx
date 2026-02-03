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
  // The home page is public for non-logged-in users, but a private dashboard for logged-in users.
  // The component at `page.tsx` handles this dual role.
  const isHomePage = pathname === '/';
  
  const isPublicRoute = isLoginPage || isPublicCampaignPath || isHomePage || isSeedPage;

  useEffect(() => {
    // Wait until the auth state is fully resolved.
    if (isLoading) {
      return;
    }

    // If the user is logged in and tries to access the login page, redirect them to the dashboard.
    if (user && isLoginPage) {
      router.push('/');
    }
    
    // If the user is not logged in and tries to access a private route, redirect them to login.
    if (!user && !isPublicRoute) {
      router.push('/login');
    }
  }, [isLoginPage, isPublicRoute, isLoading, user, router, pathname]);

  // Show a loader while the initial authentication check is running, but only for private routes.
  // This prevents a flash of private content for unauthenticated users.
  if (isLoading && !isPublicRoute) {
      return <RedirectLoader message="Authenticating..." />;
  }

  // A specific check to prevent rendering private pages while the redirect is in flight for an unauthenticated user.
  if (!isLoading && !user && !isPublicRoute) {
      return <RedirectLoader message="Redirecting to login..." />;
  }
  
  // Provide session to all pages
  return (
    <SessionProvider authUser={user}>
        {children}
    </SessionProvider>
  );
}
