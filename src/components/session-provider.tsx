
'use client';

import { createContext, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

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

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = isAuthLoading || (!!authUser && isProfileLoading);
  
  // Show a loader while fetching the user and their profile.
  // The actual route guarding will be handled by AuthProvider.
  if (isLoading && authUser) {
    return <FullScreenLoader message="Loading session..." />;
  }
  
  const contextValue = {
      user: authUser,
      userProfile,
      isLoading,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}
