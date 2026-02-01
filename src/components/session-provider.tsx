'use client';

import { createContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

const publicPaths = ['/login', '/seed', '/'];

function FullScreenLoader({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-xs text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

interface SessionContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser?.uid]);

  // Only fetch profile if user is authenticated
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = isAuthLoading || (!!authUser && isProfileLoading);

  useEffect(() => {
    if (isLoading) {
      return; // Wait for session data to be fully loaded
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!authUser && !isPublicPath) {
      router.push('/login');
    } else if (authUser && pathname === '/login') {
      router.push('/');
    }

  }, [authUser, isLoading, pathname, router]);

  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const needsRedirect = !authUser && !isPublicPath;
  
  if (isLoading || needsRedirect) {
    let message = "Loading session...";
    if (needsRedirect) message = "Redirecting to login...";
    return <FullScreenLoader message={message} />;
  }
  
  const contextValue = {
      user: authUser,
      userProfile,
      isLoading,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}
