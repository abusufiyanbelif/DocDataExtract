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
  const isPublicRoute = isLoginPage || pathname.startsWith('/campaign-public') || pathname === '/' || pathname === '/seed';

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is resolved

    const onPrivatePage = !isPublicRoute;
    
    // Not logged in and on a private page: redirect to login
    if (!user && onPrivatePage) {
      router.push('/login');
    }
    
    // Logged in and on the login page: redirect to home
    if (user && isLoginPage) {
      router.push('/');
    }
  }, [isLoading, user, isPublicRoute, isLoginPage, pathname, router]);

  // Determine if we should show a loader
  const showLoader = 
    (isLoading && !isPublicRoute) || // Still loading auth state on a private page
    (!isLoading && !user && !isPublicRoute) || // No user, on private page (waiting for redirect)
    (!isLoading && user && isLoginPage); // User, on login page (waiting for redirect)

  if (showLoader) {
    return <RedirectLoader message="Authenticating..." />;
  }
  
  // Render content
  return (
    <SessionProvider authUser={user}>
        {children}
    </SessionProvider>
  );
}
