'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { useUser } from '@/firebase/auth/use-user';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseContentWrapper } from './FirebaseContentWrapper';

const publicPaths = ['/login', '/seed'];

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

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [isLoading, user, router]);

    if (isLoading || !user) {
        return <RedirectLoader message="Authenticating..." />;
    }

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const isLoginPage = pathname === '/login';

  const { user: authUser, isLoading: isAuthLoading } = useUser();

  if (isPublicPath) {
      if (isLoginPage && !isAuthLoading && authUser) {
          return <RedirectToHome>{children}</RedirectToHome>
      }
      return (
          <div className="app-root">
              {children}
              <AppFooter />
              <Toaster />
          </div>
      );
  }

  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}

function RedirectToHome({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    useEffect(() => {
        router.push('/');
    }, [router]);
    return <RedirectLoader message="Redirecting..." />;
}
