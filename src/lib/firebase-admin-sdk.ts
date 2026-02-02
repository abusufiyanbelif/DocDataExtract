
'use server';
import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for use in server-side
// environments like Next.js Server Actions or API routes.

// It's crucial to prevent re-initialization on every hot-reload in development.
if (!admin.apps.length) {
  try {
    // This is the standard and recommended way to provide credentials for the Admin SDK.
    // It uses the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
    // 
    // For local development:
    // 1. Download your service account key JSON file from the Firebase Console.
    // 2. Save it as `serviceAccountKey.json` in your project's root folder.
    // 3. Set the environment variable in a `.env` file:
    //    GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
    //
    // For deployment (e.g., Vercel, Firebase App Hosting):
    //    Set `GOOGLE_APPLICATION_CREDENTIALS` as a secret environment variable,
    //    pasting the entire content of the JSON file as its value.
    const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? admin.credential.applicationDefault()
      : undefined;

    if (!credential) {
        console.warn(`
          ****************************************************************************************
          * Firebase Admin SDK: Service Account Credentials Not Found.                           *
          *                                                                                      *
          * Server-side admin features (like user deletion) will not work.                       *
          * Please follow the setup instructions in 'src/lib/firebase-admin-sdk.ts' to proceed.  *
          ****************************************************************************************
        `);
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

// Export the admin services. If initialization failed, these will be null,
// and any server action using them will fail gracefully.
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;
