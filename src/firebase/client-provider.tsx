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
          setFirebaseServices({ ...services, initializationError: null });
        } catch (error: any) {
          // This catch block is for fatal errors (e.g., invalid config).
          // Firestore-specific errors are handled within initializeFirebase.
          // Per the user's request, we will not set a global error that kills the UI.
          console.error(
            'A fatal Firebase initialization error occurred, but allowing app to continue. Some features will be unavailable.',
            error
          );
          setFirebaseServices({
            app: null,
            auth: null,
            firestore: null,
            storage: null,
            initializationError: null, // Set to null to prevent global error screen.
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
