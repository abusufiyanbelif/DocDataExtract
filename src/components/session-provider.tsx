'use client';

import { createContext, useMemo, ReactNode } from 'react';
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

interface SessionContextType {
    user: User; // User is guaranteed to exist here
    userProfile: UserProfile | null;
    isLoading: boolean;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

// It now receives the auth user as a prop
export function SessionProvider({ authUser, children }: { authUser: User; children: ReactNode }) {
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  // Auth is no longer loading here, only profile
  const isLoading = isProfileLoading;
  
  const contextValue = {
      user: authUser,
      userProfile,
      isLoading,
  };

  return (
    <SessionContext.Provider value={contextValue}>
        {children}
    </SessionContext.Provider>
  );
}
