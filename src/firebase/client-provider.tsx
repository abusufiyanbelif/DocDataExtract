'use client';
import { ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from './provider';

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
    // This check is redundant with useEffect but provides extra safety.
    if (typeof window === 'undefined') return;

    // Dynamically import the initializeFirebase function.
    // This prevents the firebase SDK from being included in the server-side bundle.
    import('./index').then(({ initializeFirebase }) => {
        try {
          const services = initializeFirebase();
          setFirebaseServices(services);
        } catch (error: any) {
          // This catch block is for fatal errors (e.g., invalid config).
          console.error(
            'A fatal Firebase initialization error occurred:',
            error
          );
          setFirebaseServices({
            app: null,
            auth: null,
            firestore: null,
            storage: null,
            initializationError: error,
          });
        }
    });
  }, []);

  return (
    <FirebaseProvider value={firebaseServices}>
      {children}
    </FirebaseProvider>
  );
}
