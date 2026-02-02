'use client';
import { ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from './provider';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';


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
    if (typeof window === 'undefined') return;

    try {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          throw new Error('Firebase config is incomplete. Please ensure all NEXT_PUBLIC_FIREBASE_... environment variables are set.');
      }

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      let firestore: Firestore | null = null;
      let storage: FirebaseStorage | null = null;
      let errorMessages: string[] = [];

      try {
        firestore = getFirestore(app);
      } catch (e: any) {
        console.warn('Firestore initialization failed. This may be expected if the service is not enabled in your Firebase project.');
        errorMessages.push("Firestore is not available.");
      }

      try {
        storage = getStorage(app);
      } catch (e: any) {
        console.warn('Storage initialization failed. This may be expected if the service is not enabled in your Firebase project.');
        errorMessages.push("Cloud Storage is not available.");
      }

      const initializationError = errorMessages.length > 0 
          ? new Error(errorMessages.join('\n')) 
          : null;

      setFirebaseServices({ app, auth, firestore, storage, initializationError });

    } catch (error: any) {
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
  }, []);

  return (
    <FirebaseProvider value={firebaseServices}>
      {children}
    </FirebaseProvider>
  );
}
