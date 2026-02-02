'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This interface defines the shape of the object that will be provided by the context.
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  initializationError: Error | null;
}

// Create the context with an undefined initial value.
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// This component will wrap parts of the app that need access to Firebase services.
export const FirebaseProvider: React.FC<{ value: FirebaseContextState; children: ReactNode }> = ({ value, children }) => {
  return (
    <FirebaseContext.Provider value={value}>
        <FirebaseErrorListener />
        {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Custom hook to access the Firebase context.
 * This makes it easy for components to get Firebase services.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

// Helper hooks to get individual services, which can be useful for brevity.

/**
 * Hook to access the Firebase App instance.
 * Returns null if initialization failed.
 */
export const useFirebaseApp = (): FirebaseApp | null => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/**
 * Hook to access the Firebase Auth instance.
 * Returns null if initialization failed.
 */
export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

/**
 * Hook to access the Firestore instance.
 * Returns null if initialization failed.
 */
export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};

/**
 * Hook to access the Firebase Storage instance.
 * Returns null if initialization failed.
 */
export const useStorage = (): FirebaseStorage | null => {
    const { storage } = useFirebase();
    return storage;
};

/**
 * A hook to memoize Firebase queries or references.
 * It's crucial to prevent infinite loops in `useEffect` when using Firestore hooks.
 * @param factory A function that returns a Firestore query or reference.
 * @param deps The dependency array for the `useMemo` hook.
 */
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, deps);
}
