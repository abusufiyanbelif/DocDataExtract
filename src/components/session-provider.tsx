'use client';

import { createContext, useMemo, ReactNode } from 'react';
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

interface SessionContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ authUser, children }: { authUser?: User | null; children: ReactNode }) {
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = authUser ? isProfileLoading : false;
  
  const contextValue = {
      user: authUser || null,
      userProfile: userProfile || null,
      isLoading,
  };

  return (
    <SessionContext.Provider value={contextValue}>
        {children}
    </SessionContext.Provider>
  );
}
