
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<{
    app: any;
    auth: any;
    firestore: any;
    storage: any;
    initializationError: Error | null;
  }>({
    app: null,
    auth: null,
    firestore: null,
    storage: null,
    initializationError: null,
  });

  useEffect(() => {
    // ✅ absolutely prevent SSR execution
    if (typeof window === 'undefined') return;

    try {
      const services = initializeFirebase();
      setFirebaseServices({ ...services, initializationError: null });
    } catch (error: any) {
      console.error(
        'Failed to initialize Firebase. Please check your configuration.',
        error
      );

      let finalError = error;

      if (
        error?.code === 'unavailable' ||
        error?.message?.toLowerCase().includes('is not available')
      ) {
        let serviceName = 'a Firebase service';
        if (error.message.includes('firestore')) serviceName = 'Firestore';
        if (error.message.includes('auth')) serviceName = 'Authentication';
        if (error.message.includes('storage')) serviceName = 'Storage';

        finalError = new Error(
          `The ${serviceName} is not available. This usually means it has not been enabled in the Firebase Console or is being initialized during server-side rendering.`
        );
        finalError.stack = error.stack;
      }

      setFirebaseServices({
        app: null,
        auth: null,
        firestore: null,
        storage: null,
        initializationError: finalError,
      });
    }
  }, []);

  return (
    <FirebaseProvider value={firebaseServices}>
      {children}
    </FirebaseProvider>
  );
}
