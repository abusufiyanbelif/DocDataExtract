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
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
};


async function checkFirebaseAdmin() {
    log.step(1, 'Checking Firebase Admin SDK Initialization');
    try {
        const serviceAccount = require('../../serviceAccountKey.json');
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        log.dim(`Attempting to initialize with serviceAccountKey.json for project: ${projectId || 'Not Set'}`);
        if (!projectId) {
            throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in your .env file.');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        log.success(`Firebase Admin SDK initialized successfully for project: ${projectId}`);
        return true;
    } catch (e: any) {
        if (e.code === 'app/duplicate-app') {
            log.success('Firebase Admin SDK already initialized.');
            return true;
        }
        if (e.code === 'MODULE_NOT_FOUND') {
            log.error('Firebase Admin SDK initialization failed: `serviceAccountKey.json` not found.');
            log.info("Please download your service account key from the Firebase Console and place it as 'serviceAccountKey.json' in your project's root directory.");
        } else {
            log.error(`Firebase Admin SDK initialization failed: ${e.message}`);
        }
        return false;
    }
}

async function checkFirestore() {
    log.step(2, 'Checking Firestore Connectivity & Data');
    try {
        const db = admin.firestore();
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        log.info(`Attempting to access "(default)" database for project "${projectId}"...`);
        const collections = await db.listCollections();
        log.success(`Successfully connected to Firestore. Project has a default database with ${collections.length} root collections.`);
        
        if (collections.length > 0) {
            log.dim(`   Collections found: ${collections.map(c => c.id).join(', ')}`);
        }

        const usersSnap = await db.collection('users').count().get();
        log.info(`Found ${usersSnap.data().count} documents in the 'users' collection.`);
        
        log.info('Verifying essential data (admin user)...');
        const adminLookupSnap = await db.collection('user_lookups').doc('admin').get();
        if (adminLookupSnap.exists) {
            log.success('Admin user lookup document found.');
            const adminUserSnap = await db.collection('users').where('userKey', '==', 'admin').limit(1).get();
             if (!adminUserSnap.empty) {
                 log.success('Admin user profile document found.');
             } else {
                 log.warn('Admin lookup record exists, but the corresponding user document in the "users" collection was not found. Please run `npm run db:seed` to repair it.');
             }
        } else {
            log.error('Essential data check failed: Admin user lookup document not found.');
            log.info('This could mean a few things:');
            log.dim('1. Your Firestore security rules are blocking admin access (unlikely for this script).');
            log.dim('2. The database is empty. Please run `npm run db:seed` to initialize the default admin user.');
            log.dim(`3. You are connected to the wrong database. Check your projectId is set to "${projectId}".`);
        }
    } catch (e: any) {
        log.error(`Firestore check failed with an error: ${e.message}`);
        
        if (e.message?.includes('does not have a default database')) {
            log.info('This means you have not created a Firestore database in your project yet.');
            log.dim(`Please visit the Firebase Console to create one: https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore`);
        } else if (e.message?.includes('permission denied') || e.message?.includes('missing permissions')) {
            log.info('This is a permissions issue with your service account.');
            log.dim('Go to Google Cloud IAM and ensure your service account has the "Cloud Datastore User" or "Firebase Admin" role.');
        } else if (e.message?.includes('Cloud Firestore API has not been used')) {
            log.info('The Cloud Firestore API is not enabled for your project.');
            log.dim(`Please visit this link to enable it: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
        } else {
            log.info('This might be a general connectivity issue or a problem with your service account credentials.');
        }
    }
}

async function checkAuth() {
    log.step(3, 'Checking Firebase Authentication');
    try {
        const auth = admin.auth();
        log.info('Attempting to list 1 user from Firebase Auth...');
        const users = await auth.listUsers(1);
        const userCount = (await auth.listUsers()).users.length;
        log.success(`Successfully connected to Firebase Auth. Your project has ${userCount} user(s).`);
    } catch (e: any) {
        log.error(`Firebase Auth check failed: ${e.message}`);
        log.info('This could be a problem with your GOOGLE_APPLICATION_CREDENTIALS, or the "Identity Toolkit API" may not be enabled in your Google Cloud project.');
        log.dim(`Link to enable: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    }
}

async function checkStorage() {
    log.step(4, 'Checking Firebase Storage');
    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        log.dim(`Using NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${bucketName || 'Not Set'}`);
        if (!bucketName) {
            throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in your .env file.');
        }

        const storage = admin.storage().bucket(bucketName);
        log.info('Attempting to check bucket existence...');
        const [exists] = await storage.exists();
        if (exists) {
            log.success(`Successfully connected to Firebase Storage. Bucket "${bucketName}" exists.`);
        } else {
            throw new Error(`The bucket "${bucketName}" does not exist in your Firebase project.`);
        }
    } catch (e: any) {
        log.error(`Firebase Storage check failed: ${e.message}`);
        if (e.message.includes('does not have storage.objects.list access')) {
            log.info('This is a permissions issue. Go to Google Cloud IAM and ensure your service account has the "Storage Admin" or "Storage Object Admin" role.');
        } else {
            log.info(`The bucket "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" may not exist or your service account lacks permissions to access it.`);
        }
    }
}

async function checkGenkit() {
    log.step(5, 'Checking Genkit AI (Gemini)');
    try {
        const geminiKey = process.env.GEMINI_API_KEY;
        log.dim(`Using GEMINI_API_KEY: ${geminiKey ? '...'+geminiKey.slice(-4) : 'Not Set'}`);
        if (!geminiKey) {
            log.warn('GEMINI_API_KEY is not set. Skipping Genkit check.');
            return;
        }
        log.info('Pinging the Gemini model via Genkit flow...');
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
    console.log('\n\x1b[1m\x1b[35m🚀 Running System Diagnostic Checks from Terminal...\x1b[0m');
    
    const isFirebaseAdminReady = await checkFirebaseAdmin();
    if (isFirebaseAdminReady) {
        await checkFirestore();
        await checkAuth();
        await checkStorage();
    } else {
        log.warn('Skipping Firestore, Auth, and Storage checks due to Admin SDK initialization failure.');
    }

    await checkGenkit();

    console.log('\n\x1b[1m\x1b[35m🎉 Diagnostics complete.\x1b[0m');
    console.log('\n\x1b[33m⚠️  If these checks pass but your app shows errors, ensure your public Firebase keys are in a `.env` file.\x1b[0m');
}

main().catch(console.error);