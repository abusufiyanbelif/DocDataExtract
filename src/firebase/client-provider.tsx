'use client';
import { ReactNode, useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (error) {
      console.error("Failed to initialize Firebase. Please check your configuration.", error);
      return { app: null, auth: null, firestore: null };
    }
  }, []);

  return <FirebaseProvider value={firebaseServices}>{children}</FirebaseProvider>;
}
