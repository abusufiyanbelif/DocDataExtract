
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { runDiagnosticCheck } from '../src/ai/flows/run-diagnostic-check';

// A simple logger with colors
const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg: string) => console.warn(`\x1b[33m⚠️ ${msg}\x1b[0m`),
  step: (num: number, title: string) => console.log(`\n\x1b[36m--- ${num}. ${title} ---\x1b[0m`),
};


async function checkFirebaseAdmin() {
    log.step(1, 'Checking Firebase Admin SDK Initialization');
    try {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for admin scripts.');
        }
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        log.success('Firebase Admin SDK initialized successfully.');
        return true;
    } catch (e: any) {
        if (e.code === 'app/duplicate-app') {
            log.success('Firebase Admin SDK already initialized.');
            return true;
        }
        log.error(`Firebase Admin SDK initialization failed: ${e.message}`);
        return false;
    }
}

async function checkFirestore() {
    log.step(2, 'Checking Firestore Connectivity');
    try {
        const db = admin.firestore();
        // Try to read a known document that should exist after seeding
        const adminLookupSnap = await db.collection('user_lookups').doc('admin').get();
        if (adminLookupSnap.exists) {
            log.success('Successfully connected to Firestore and read a document.');
        } else {
            log.warn('Connected to Firestore, but default admin lookup document was not found. Consider running `npm run db:seed`.');
        }
    } catch (e: any) {
        log.error(`Firestore check failed: ${e.message}`);
        log.info('This could be a problem with your GOOGLE_APPLICATION_CREDENTIALS, or the Cloud Firestore API may not be enabled in your Google Cloud project.');
    }
}

async function checkAuth() {
    log.step(3, 'Checking Firebase Authentication');
    try {
        const auth = admin.auth();
        // Try to list a single user
        const users = await auth.listUsers(1);
        log.success(`Successfully connected to Firebase Auth. Found ${users.users.length > 0 ? 'at least one user' : 'no users'}.`);
    } catch (e: any) {
        log.error(`Firebase Auth check failed: ${e.message}`);
        log.info('This could be a problem with your GOOGLE_APPLICATION_CREDENTIALS, or the Firebase Authentication API may not be enabled in your Google Cloud project.');
    }
}

async function checkStorage() {
    log.step(4, 'Checking Firebase Storage');
    try {
        const storage = admin.storage().bucket();
        // Try to list files (or check if bucket exists)
        await storage.getFiles({ maxResults: 1 });
        log.success('Successfully connected to Firebase Storage.');
    } catch (e: any) {
        log.error(`Firebase Storage check failed: ${e.message}`);
        if (e.message.includes('not found')) {
            log.info(`The bucket "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" may not exist or your service account lacks permissions.`);
        }
    }
}

async function checkGenkit() {
    log.step(5, 'Checking Genkit AI (Gemini)');
    try {
        if (!process.env.GEMINI_API_KEY) {
            log.warn('GEMINI_API_KEY is not set. Skipping Genkit check.');
            return;
        }
        const result = await runDiagnosticCheck();
        if (result.ok) {
            log.success(`Genkit check successful: ${result.message}`);
        } else {
            log.error(`Genkit check failed: ${result.message}`);
        }
    } catch (e: any) {
        log.error(`Genkit check threw an error: ${e.message}`);
    }
}

async function main() {
    console.log('🚀 Running System Diagnostic Checks from Terminal...');
    
    const isFirebaseAdminReady = await checkFirebaseAdmin();
    if (isFirebaseAdminReady) {
        await checkFirestore();
        await checkAuth();
        await checkStorage();
    } else {
        log.warn('Skipping Firestore, Auth, and Storage checks due to Admin SDK initialization failure.');
    }

    await checkGenkit();

    console.log('\n🎉 Diagnostics complete.');
}

main().catch(console.error);
