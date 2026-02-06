
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { useUser } from '@/firebase';

function AuthLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-xs text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();

  const isLoginPage = pathname === '/login';
  const isPublicRoute = isLoginPage || pathname.startsWith('/campaign-public') || pathname.startsWith('/leads-public') || pathname === '/' || pathname === '/seed';

  useEffect(() => {
    if (isLoading) {
      return; // Wait for the auth state to be confirmed
    }

    // If we are not on a public route and there is no user, redirect to login.
    if (!isPublicRoute && !user) {
      router.push('/login');
    }

    // If we are on the login page and a user is already logged in, redirect to dashboard.
    if (isLoginPage && user) {
      router.push('/dashboard');
    }
  }, [isLoading, user, isPublicRoute, isLoginPage, router, pathname]);

  // Show the loader only if we are still verifying the auth state on a private page.
  const showLoader = isLoading && !isPublicRoute;
  
  if (showLoader) {
    return <AuthLoader />;
  }
  
  // Render the session provider and children.
  return (
    <SessionProvider authUser={user}>
        {children}
    </SessionProvider>
  );
}
