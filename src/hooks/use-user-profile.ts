'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useUserProfile() {
  const { user: authUser, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) {
      return null;
    }
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser?.uid]);

  const { data: userProfile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userDocRef);

  /**
   * Provides a manual refetch capability. In this implementation, it's a no-op
   * because `useDoc` establishes a real-time listener, which updates automatically.
   * This function is maintained for API compatibility with components that may call it.
   */
  const refetch = () => {
    console.log("useUserProfile.refetch() called. Note: This is a no-op as the hook is real-time.");
  };

  return { 
    userProfile, 
    isLoading: isAuthLoading || isProfileLoading, 
    error,
    refetch
  };
}
