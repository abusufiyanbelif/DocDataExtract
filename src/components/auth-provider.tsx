
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SessionProvider } from '@/components/session-provider';
import { useUser, FirebaseProvider } from '@/firebase';
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

// This component is for truly public routes that DO NOT need firebase.
const TrulyPublicContent = ({ children }: { children: ReactNode }) => {
    return (
      <>
        {children}
        <Toaster />
      </>
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
  
  // Routes that DON'T need firebase AT ALL
  if (isSeedPage) {
    return <TrulyPublicContent>{children}</TrulyPublicContent>;
  }

  // Routes that are public but DO need firebase
  if (isPublicCampaignPath || isHomePage) {
    return (
        <FirebaseProvider>
            <PublicFirebaseContent>{children}</PublicFirebaseContent>
        </FirebaseProvider>
    );
  }
  
  // Login page needs firebase for auth checks
  if (isLoginPage) {
    return (
        <FirebaseProvider>
            <LoginPageContent>{children}</LoginPageContent>
        </FirebaseProvider>
    );
  }

  // All other pages are private by default and need Firebase
  return (
    <FirebaseProvider>
        <AuthenticatedContent>{children}</AuthenticatedContent>
    </FirebaseProvider>
  );
}
