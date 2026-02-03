
import 'dotenv/config';
import { adminAuth, adminDb } from '../src/lib/firebase-admin-sdk';

// A simple logger with colors
const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg: string) => console.warn(`\x1b[33m⚠️ ${msg}\x1b[0m`),
  step: (title: string) => console.log(`\n\x1b[36m--- ${title} ---\x1b[0m`),
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
  detail: (key: string, value: string) => console.log(`   - ${key}: \x1b[1m${value}\x1b[0m`),
};


async function checkDatabaseDetails() {
    log.step('Checking Firestore Database Details');
    if (!adminDb) {
        throw new Error('Admin DB not initialized. Check serviceAccountKey.json.');
    }
    try {
        log.info('This script targets the (default) Firestore database.');
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'N/A';
        log.detail('Project ID', projectId);

        const collections = await adminDb.listCollections();
        log.detail('Total Root Collections', String(collections.length));
        
        if (collections.length > 0) {
            log.dim(`   Collections found: ${collections.map(c => c.id).join(', ')}`);
        } else {
            log.warn('   No collections found in the database. It might be empty.');
        }
        
        const usersSnap = await adminDb.collection('users').count().get();
        log.detail('Documents in "users" collection', String(usersSnap.data().count));
        
        log.success('Database connectivity confirmed.');

    } catch (e: any) {
        log.error(`Firestore check failed: ${e.message}`);
        if (e.message?.includes('does not have a default database')) {
            log.info('This means you have not created a Firestore database in your project yet.');
            log.dim(`Please visit the Firebase Console to create one: https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore`);
        } else if (e.message?.includes('permission denied') || e.message?.includes('missing permissions')) {
            log.info('This is a permissions issue with your service account.');
            log.dim('Go to Google Cloud IAM and ensure your service account has the "Cloud Datastore User" or "Firebase Admin" role.');
        } else {
            log.info('This might be a general connectivity issue.');
        }
        // Stop further checks if we can't even connect to the DB
        throw new Error('Aborting due to database connection failure.');
    }
}

async function checkAdminUserDetails() {
    log.step('Verifying System Admin User Details');
    const adminEmail = 'baitulmalss.solapur@gmail.com';
    const adminLoginId = 'admin';
    const adminUserKey = 'admin';
    const adminPhone = '9270946423';

    if (!adminAuth || !adminDb) {
        throw new Error('Admin Auth/DB not initialized. Check serviceAccountKey.json.');
    }

    try {
        log.info(`Checking for admin user in Firebase Auth with email: ${adminEmail}`);
        const userRecord = await adminAuth.getUserByEmail(adminEmail);
        log.success('Admin user found in Firebase Authentication.');
        log.detail('Auth UID', userRecord.uid);
        
        log.info(`Checking for user document in Firestore at 'users/${userRecord.uid}'`);
        const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();
        if (userDoc.exists) {
            log.success('Admin user document found in "users" collection.');
            const userData = userDoc.data();
            log.detail('DB Role', userData?.role);
            log.detail('DB Status', userData?.status);
        } else {
            log.error('Admin user document NOT found in "users" collection.');
            log.warn('The Auth user exists, but their database record is missing. Run `npm run db:seed` to repair.');
        }

        log.info('Checking for lookup documents in "user_lookups" collection...');
        const lookupsToCheck = [adminLoginId, adminUserKey, adminPhone];
        let allLookupsOk = true;
        for (const lookupId of lookupsToCheck) {
            const lookupDoc = await adminDb.collection('user_lookups').doc(lookupId).get();
            if (lookupDoc.exists) {
                log.success(`   - Lookup for '${lookupId}' found.`);
            } else {
                log.error(`   - Lookup for '${lookupId}' NOT found.`);
                allLookupsOk = false;
            }
        }

        if (!allLookupsOk) {
            log.warn('One or more lookup records are missing. Run `npm run db:seed` to repair.');
        }

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            log.error('Admin user does not exist in Firebase Authentication.');
            log.info('Please run `npm run db:seed` to create the admin user and all associated database records.');
        } else {
            log.error(`An unexpected error occurred while checking admin details: ${error.message}`);
        }
        throw new Error('Aborting due to admin user check failure.');
    }
}


async function main() {
    console.log('\n\x1b[1m\x1b[35m🔬 Running Detailed Database Diagnostic Check...\x1b[0m');
    
    if (adminDb && adminAuth) {
        log.step('Initializing Firebase Admin SDK');
        log.success('Firebase Admin SDK initialized successfully via central module.');
        try {
            await checkDatabaseDetails();
            await checkAdminUserDetails();
            log.success('\n🎉 Database diagnostics complete. All checks passed!');
        } catch (e: any) {
             log.error(`\nScript aborted: ${e.message}`);
             process.exit(1);
        }
    } else {
        log.error('\nScript aborted: Could not initialize Firebase Admin SDK. Is `serviceAccountKey.json` present?');
        process.exit(1);
    }
}

main().catch(console.error);
