import { FirebaseOptions } from 'firebase/app';

// This config is populated by the backend and should not be modified.
// During local development, you can add a .env.local file with
// NEXT_PUBLIC_FIREBASE_CONFIG='{...}'
// with your Firebase project's web app config.
export const firebaseConfig: FirebaseOptions = JSON.parse(
  process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}'
);
