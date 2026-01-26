'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useUserProfile() {
  const { user: authUser, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userKey = useMemo(() => {
      if (!authUser?.email) return null;
      return authUser.email.split('@')[0];
  }, [authUser]);

  useEffect(() => {
      if (isAuthLoading) {
          return;
      }
      if (!firestore || !userKey) {
          setUserProfile(null);
          setIsLoading(false);
          return;
      }

      setIsLoading(true);
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('userKey', '==', userKey));
      
      const unsubscribe = onSnapshot(q, 
          (snapshot) => {
              if (!snapshot.empty) {
                  const userDoc = snapshot.docs[0];
                  setUserProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
              } else {
                  setUserProfile(null);
                  console.warn(`User profile not found in Firestore for userKey: ${userKey}`);
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
  }, [firestore, userKey, isAuthLoading]);

  return { userProfile, isLoading: isAuthLoading || isLoading, error };
}
