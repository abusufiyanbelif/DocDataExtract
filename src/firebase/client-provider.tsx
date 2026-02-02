
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseContextValue = useMemo(() => {
    try {
      const { firebaseApp, auth, firestore, storage } = initializeFirebase();
      return {
        firebaseApp,
        auth,
        firestore,
        storage,
        initializationError: null,
      };
    } catch (error: any) {
        console.error("Firebase initialization failed in client provider:", error);
        return {
            firebaseApp: null,
            auth: null,
            firestore: null,
            storage: null,
            initializationError: error,
        };
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider value={firebaseContextValue}>
      {children}
    </FirebaseProvider>
  );
}
