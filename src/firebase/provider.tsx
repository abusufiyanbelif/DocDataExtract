'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<FirebaseContextType>({
    app: null,
    auth: null,
    firestore: null,
    storage: null,
    initializationError: null,
  });

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Firebase client cannot run on server');
      }

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      
      let firestoreInstance: Firestore | null = null;
      let storageInstance: FirebaseStorage | null = null;
      let initError: Error | null = null;

      try {
        firestoreInstance = getFirestore(app);
      } catch (e: any) {
        console.error("Failed to initialize Firestore", e);
        initError = new Error(`Service firestore is not available. Please enable it in your Firebase project. Details: ${e.message}`);
      }

      try {
        storageInstance = getStorage(app);
      } catch (e: any) {
        console.error("Failed to initialize Cloud Storage", e);
        const storageErrorMessage = `Service storage is not available. Please enable it in your Firebase project. Details: ${e.message}`;
        initError = initError ? new Error(`${initError.message}\n${storageErrorMessage}`) : new Error(storageErrorMessage);
      }

      setValue({
        app,
        auth: getAuth(app),
        firestore: firestoreInstance,
        storage: storageInstance,
        initializationError: initError,
      });

    } catch (e: any) {
      console.error('Firebase init failed:', e);
      setValue({
        app: null,
        auth: null,
        firestore: null,
        storage: null,
        initializationError: e,
      });
    }
  }, []);

  if (!value.app && !value.initializationError) {
      // Don't render anything until initialization has at least been attempted.
      // This prevents hydration mismatches.
      return null;
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
};


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
