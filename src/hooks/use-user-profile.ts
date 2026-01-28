'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useUserProfile() {
  const { user: authUser, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // useRef to hold the unsubscribe function, preventing race conditions.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchData = useCallback(() => {
    // Clean up any existing listener before creating a new one.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    if (!firestore || !authUser) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const userDocRef = doc(firestore, 'users', authUser.uid);
    
    // Create the new listener and store its cleanup function in the ref.
    unsubscribeRef.current = onSnapshot(userDocRef, 
      (doc) => {
        if (doc.exists()) {
          setUserProfile({ id: doc.id, ...doc.data() } as UserProfile);
        } else {
          setUserProfile(null);
          // This can happen briefly during logout/login, so it's a warn not an error.
          console.warn(`User profile not found in Firestore for UID: ${authUser.uid}`);
        }
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching user profile:", err);
        setError(err);
        setIsLoading(false);
      }
    );
  }, [firestore, authUser]);


  useEffect(() => {
    if (isAuthLoading) {
      // Wait for authentication to resolve before fetching data.
      return;
    }
    
    fetchData(); // Initial fetch and listener setup.

    // The main cleanup function that runs when the component unmounts.
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthLoading, authUser, firestore, fetchData]);

  // The refetch function is now simply a call to our stable fetchData function.
  const refetch = fetchData;

  return { userProfile, isLoading: isAuthLoading || isLoading, error, refetch };
}
