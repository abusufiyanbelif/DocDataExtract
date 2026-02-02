'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { FirebaseProvider, useUser } from '@/firebase';
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

// This component is ONLY for authenticated routes. It assumes it's inside FirebaseProvider.
const AuthenticatedContent = ({ children }: { children: ReactNode }) => {
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
};

const LoginPageContent = ({ children }: { children: ReactNode }) => {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.push('/');
        }
    }, [isLoading, user, router]);

    if (isLoading || user) {
        return <RedirectLoader message="Redirecting..." />;
    }

    return (
        <div className="app-root">
            {children}
            <AppFooter />
            <Toaster />
        </div>
    );
};

// Public content does not need any auth checks, just the session provider for hooks.
const PublicContent = ({children}: {children: ReactNode}) => {
    return (
        <SessionProvider>
            <div className="app-root">
              {children}
              <AppFooter />
            </div>
            <Toaster />
        </SessionProvider>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isSeedPage = pathname === '/seed';
  const isPublicCampaignPath = pathname.startsWith('/campaign-public');
  const isHomePage = pathname === '/';

  // The seed page is truly public and doesn't need Firebase.
  if (isSeedPage) {
    return (
        <>
            {children}
            <Toaster />
        </>
    );
  }

  // All other pages (public, login, private) require Firebase context.
  return (
      <FirebaseProvider>
          {isLoginPage ? (
              <LoginPageContent>{children}</LoginPageContent>
          ) : isPublicCampaignPath || isHomePage ? (
              <PublicContent>{children}</PublicContent>
          ) : (
              <AuthenticatedContent>{children}</AuthenticatedContent>
          )}
      </FirebaseProvider>
  );
}
