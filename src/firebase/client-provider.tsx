'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider, type FirebaseContextState } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [contextValue, setContextValue] = useState<FirebaseContextState>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
    initializationError: null,
  });

  useEffect(() => {
    // This effect is guaranteed to run only on the client, after the initial render.
    try {
      const { firebaseApp, auth, firestore, storage } = initializeFirebase();
      setContextValue({
        firebaseApp,
        auth,
        firestore,
        storage,
        initializationError: null,
      });
    } catch (error: any) {
      console.error("Firebase initialization failed:", error);
      setContextValue({
        firebaseApp: null,
        auth: null,
        firestore: null,
        storage: null,
        initializationError: error,
      });
    }
  }, []); // Empty dependency array ensures this runs only once.

  return (
    <FirebaseProvider value={contextValue}>
      {children}
    </FirebaseProvider>
  );
}
