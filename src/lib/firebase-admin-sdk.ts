'use server';
import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for use in server-side
// environments like Next.js Server Actions or API routes.

if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log("Firebase Admin SDK initialized successfully using serviceAccountKey.json.");
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn(`
        ****************************************************************************************
        * Firebase Admin SDK: serviceAccountKey.json Not Found.                                *
        *                                                                                      *
        * Server-side admin features (like user deletion or campaign copying) will not work.   *
        * To enable them:                                                                      *
        * 1. Download your service account key from the Firebase Console.                      *
        * 2. Save it as 'serviceAccountKey.json' in your project's root directory.             *
        ****************************************************************************************
      `);
    } else if (error.code !== 'app/duplicate-app') {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  }
}

// Export the admin services. If initialization failed, these will be null,
// and any server action using them will fail gracefully.
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;
