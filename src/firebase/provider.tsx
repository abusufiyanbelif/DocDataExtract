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
        initError = new Error("Service firestore is not available. It may not be enabled in your Firebase project.");
      }

      try {
        storage = getStorage(app);
      } catch (e: any) {
         console.warn("Firebase Storage unavailable - continuing without it. Error:", e.message);
      }

      setServices({
        app,
        auth,
        firestore,
        storage,
        initializationError: initError,
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
