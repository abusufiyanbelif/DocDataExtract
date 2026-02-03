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
  const isPublicRoute = isLoginPage || pathname.startsWith('/campaign-public') || pathname === '/' || pathname === '/seed';

  useEffect(() => {
    // Don't do anything until Firebase auth state is resolved.
    if (isLoading) {
      return;
    }

    // If user is not logged in and is trying to access a private route, redirect to login.
    if (!user && !isPublicRoute) {
      router.push('/login');
    }

    // If user is logged in and is on the login page, redirect to the home page.
    if (user && isLoginPage) {
      router.push('/');
    }
  }, [isLoading, user, isPublicRoute, isLoginPage, pathname, router]);

  // The loader should only show when we are on a private page and still figuring out who the user is,
  // or when we know they're not logged in and are about to redirect them from a private page.
  const shouldShowLoader = (isLoading && !isPublicRoute) || (!isLoading && !user && !isPublicRoute);
  
  if (shouldShowLoader) {
    return <AuthLoader />;
  }
  
  // Render the actual content if we're on a public page, or if we're on a private page and the user is loaded and valid.
  return (
    <SessionProvider authUser={user}>
        {children}
    </SessionProvider>
  );
}
