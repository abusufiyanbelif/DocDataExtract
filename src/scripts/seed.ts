import * as admin from 'firebase-admin';
import 'dotenv/config';

import { createAdminPermissions } from '../lib/modules';

const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
};

async function main() {
  console.log('\n\x1b[1m\x1b[35m🚀 Starting Database Seed Script...\x1b[0m');

  // Initialize Firebase Admin SDK
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
        log.error('`serviceAccountKey.json` not found in the project root.');
        log.info('Please download it from your Firebase project settings and place it in the root directory.');
    } else {
        log.error(`Firebase Admin SDK initialization error: ${error.message}`);
    }
    process.exit(1);
  }

  const auth = admin.auth();
  const db = admin.firestore('bmss-solapur-v6');
  
  log.info('This script targets the "bmss-solapur-v6" Firestore database.');

  const adminEmail = 'baitulmalss.solapur@gmail.com';
  const adminPhone = '9270946423';
  const adminUserKey = 'admin';
  const adminLoginId = 'admin';
  const adminPassword = 'password';

  log.info(`Checking for existing admin user with email: ${adminEmail}`);

  try {
    const userRecord = await auth.getUserByEmail(adminEmail);
    log.success(`Admin user already exists in Firebase Auth (UID: ${userRecord.uid}).`);
    log.info('Verifying database records...');

    const batch = db.batch();
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      log.dim('   - User document missing. Re-creating...');
      batch.set(userDocRef, {
        name: 'System Admin',
        email: adminEmail,
        phone: adminPhone,
        loginId: adminLoginId,
        userKey: adminUserKey,
        role: 'Admin',
        status: 'Active',
        permissions: createAdminPermissions(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdById: 'system',
        createdByName: 'System Seed',
      });
    }

    const lookupsToVerify: {[key: string]: {email: string, userKey: string}} = {};
    lookupsToVerify[adminLoginId] = { email: adminEmail, userKey: adminUserKey };
    if (adminLoginId !== adminUserKey) {
      lookupsToVerify[adminUserKey] = { email: adminEmail, userKey: adminUserKey };
    }
    lookupsToVerify[adminPhone] = { email: adminEmail, userKey: adminUserKey };

    for (const [lookupId, lookupData] of Object.entries(lookupsToVerify)) {
      const lookupDocRef = db.collection('user_lookups').doc(lookupId);
      const lookupDocSnap = await lookupDocRef.get();
      if (!lookupDocSnap.exists) {
        log.dim(`   - Lookup for "${lookupId}" missing. Re-creating...`);
        batch.set(lookupDocRef, lookupData);
      }
    }
    await batch.commit();
    log.success('Database records verified and synchronized.');
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      log.dim('👤 Admin user not found. Creating new user...');
      try {
        const newUserRecord = await auth.createUser({
          email: adminEmail,
          emailVerified: true,
          password: adminPassword,
          displayName: 'System Admin',
          phoneNumber: `+91${adminPhone}`
        });

        log.dim(`   - Auth account created with UID: ${newUserRecord.uid}.`);
        log.dim('   - Creating database records...');

        const batch = db.batch();
        
        const userDocRef = db.collection('users').doc(newUserRecord.uid);
        batch.set(userDocRef, {
            name: 'System Admin',
            email: adminEmail,
            phone: adminPhone,
            loginId: adminLoginId,
            userKey: adminUserKey,
            role: 'Admin',
            status: 'Active',
            permissions: createAdminPermissions(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdById: 'system',
            createdByName: 'System Seed'
        });

        const lookupsRef = db.collection('user_lookups');
        batch.set(lookupsRef.doc(adminLoginId), { email: adminEmail, userKey: adminUserKey });
        batch.set(lookupsRef.doc(adminUserKey), { email: adminEmail, userKey: adminUserKey });
        batch.set(lookupsRef.doc(adminPhone), { email: adminEmail, userKey: adminUserKey });

        await batch.commit();
        log.success('New admin user and all database records created successfully.');

      } catch (creationError) {
        log.error(`Failed to create new admin user: ${creationError}`);
        process.exit(1);
      }
    } else {
      log.error(`An unexpected error occurred: ${error}`);
      process.exit(1);
    }
  }

  console.log('\n\x1b[1m---');
  console.log('🔑 Admin Credentials:');
  console.log(`   Login ID: ${adminLoginId}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('---\x1b[0m');
  log.success('🎉 Seed script finished successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
