'use client';
import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useUserProfile() {
  const { user: authUser, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // A function to manually refetch the profile.
  const refetch = useCallback(() => {
    if (!firestore || !authUser) return;

    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('__name__', '==', authUser.uid));
    
    const unsubscribe = onSnapshot(q, 
        (snapshot) => {
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                setUserProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
            } else {
                setUserProfile(null);
                console.warn(`User profile not found in Firestore for UID: ${authUser.uid}`);
            }
            setIsLoading(false);
        },
        (err) => {
            console.error("Error fetching user profile:", err);
            setError(err);
            setIsLoading(false);
        }
    );

    return () => unsubscribe();
  }, [firestore, authUser]);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!authUser || !firestore) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const unsubscribe = refetch();

    return () => {
      if (unsubscribe) unsubscribe();
    };

  }, [authUser, firestore, isAuthLoading, refetch]);

  return { userProfile, isLoading: isAuthLoading || isLoading, error, refetch };
}
