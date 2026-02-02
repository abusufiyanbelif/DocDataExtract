'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
  initializationError: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseContextType>({
    app: null,
    auth: null,
    firestore: null,
    storage: null,
    initializationError: null,
  });

  useEffect(() => {
    if (services.app) return; // Already initialized

    if (typeof window === 'undefined') {
      // This is a safety net. This function should not be reached if providers are used correctly.
      setServices({
        app: null, auth: null, firestore: null, storage: null,
        initializationError: new Error("Firebase Web SDK blocked on server (SSR protection). This indicates a provider setup error.")
      });
      return;
    }

    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      
      let firestore: Firestore | null = null;
      let storage: FirebaseStorage | null = null;
      let initError: Error | null = null;

      try {
        firestore = getFirestore(app);
      } catch (e: any) {
        console.error("Firestore initialization failed:", e);
        // This is a fatal error for the authenticated app.
        initError = new Error("Service firestore is not available. It may not be enabled in your Firebase project.");
      }

      try {
        storage = getStorage(app);
      } catch (e: any) {
         // This is a non-fatal warning as per instructions.
         console.warn("Firebase Storage unavailable - continuing without it. Error:", e.message);
      }

      setServices({
        app,
        auth,
        firestore,
        storage,
        initializationError: initError, // Only Firestore error is considered fatal for app boot
      });
    } catch (error: any) {
      console.error('Firebase initialization failed:', error);
      setServices(s => ({ ...s, initializationError: error }));
    }
  }, [services.app]);

  return (
    <FirebaseContext.Provider value={services}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().app;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useStorage = () => useFirebase().storage;
