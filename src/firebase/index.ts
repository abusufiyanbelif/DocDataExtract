
'use client';
// This file is the single entrypoint for all Firebase client-side functionality.
// It should be used by any client component that needs to interact with Firebase.

export {
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage
} from './provider';

export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
