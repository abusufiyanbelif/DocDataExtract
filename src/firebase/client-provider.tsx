
'use client';
import { ReactNode, useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    try {
      const services = initializeFirebase();
      return { ...services, initializationError: null };
    } catch (error: any) {
      console.error("Failed to initialize Firebase. Please check your configuration.", error);
      return { app: null, auth: null, firestore: null, storage: null, initializationError: error };
    }
  }, []);

  return <FirebaseProvider value={firebaseServices}>{children}</FirebaseProvider>;
}
