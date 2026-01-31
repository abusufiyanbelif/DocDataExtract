'use server';

import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for use in server-side
// environments like Next.js Server Actions or API routes.

// It's crucial to prevent re-initialization on every hot-reload in development.
if (!admin.apps.length) {
  try {
    // When deployed to environments like Vercel, the service account credentials
    // should be set as environment variables. GOOGLE_APPLICATION_CREDENTIALS
    // can be the full JSON string.
    // For local development, set the GOOGLE_APPLICATION_CREDENTIALS environment
    // variable in your .env file to point to the service account key file.
    const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? admin.credential.applicationDefault()
      : undefined;

    if (!credential) {
        console.warn("Firebase Admin SDK: GOOGLE_APPLICATION_CREDENTIALS not set. Admin features will not work.");
    } else {
         admin.initializeApp({
            credential,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        console.log("Firebase Admin SDK initialized successfully.");
    }
  } catch (error: any) {
    // A duplicate-app error is fine, it means it's already initialized.
    if (error.code !== 'app/duplicate-app') {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  }
}

// Export the admin services.
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;
