
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

// This component is for routes that need Firebase, but are public.
// e.g. the home page and public campaign pages.
const PublicFirebaseContent = ({ children }: { children: ReactNode }) => {
    // We don't need to check for a user here, just provide the session.
    return (
      <SessionProvider>
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isSeedPage = pathname === '/seed';
  const isPublicCampaignPath = pathname.startsWith('/campaign-public');
  const isHomePage = pathname === '/';
  
  // Routes that are public but DO need firebase
  if (isPublicCampaignPath || isHomePage || isSeedPage) {
    return (
      <PublicFirebaseContent>{children}</PublicFirebaseContent>
    );
  }
  
  // Login page needs firebase for auth checks
  if (isLoginPage) {
    return (
      <LoginPageContent>{children}</LoginPageContent>
    );
  }

  // All other pages are private by default and need Firebase
  return (
    <AuthenticatedContent>{children}</AuthenticatedContent>
  );
}
