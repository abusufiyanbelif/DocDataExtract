
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export function initializeFirebase(): { 
    app: FirebaseApp; 
    auth: Auth; 
    firestore: Firestore | null; 
    storage: FirebaseStorage; 
    initializationError: Error | null;
} {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase config is incomplete. Please ensure all NEXT_PUBLIC_FIREBASE_... environment variables are set.');
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  const auth = getAuth(app);
  
  let firestore: Firestore | null = null;
  let initializationError: Error | null = null;
  try {
    firestore = getFirestore(app);
  } catch (e: any) {
    // This can happen if the Firestore service is not enabled in the project yet.
    // We will handle this gracefully in the AuthProvider.
    console.warn('Firestore initialization failed. This may be expected if the service is not enabled.');
    initializationError = new Error(`Firestore is not available. Please ensure it is enabled in your Firebase project. (${e.message})`);
  }

  const storage = getStorage(app);

  return { app, auth, firestore, storage, initializationError };
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, useStorage } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
export type { SecurityRuleContext } from './errors';
