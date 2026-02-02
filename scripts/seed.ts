
import * as admin from 'firebase-admin';
import 'dotenv/config';

import { createAdminPermissions } from '../src/lib/modules';

async function main() {
  console.log('🚀 Starting Database Seed Script...');

  // Initialize Firebase Admin SDK
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('❌ ERROR: `serviceAccountKey.json` not found in the project root.');
        console.error('Please download it from your Firebase project settings and place it in the root directory.');
    } else {
        console.error('❌ Firebase Admin SDK initialization error:', error);
    }
    process.exit(1);
  }

  const auth = admin.auth();
  const db = admin.firestore();

  const adminEmail = 'baitulmalss.solapur@gmail.com';
  const adminPhone = '9270946423';
  const adminUserKey = 'admin';
  const adminLoginId = 'admin';
  const adminPassword = 'password';

  console.log(`ℹ️ Checking for existing admin user with email: ${adminEmail}`);

  try {
    const userRecord = await auth.getUserByEmail(adminEmail);
    console.log(`✅ Admin user already exists in Firebase Auth (UID: ${userRecord.uid}).`);
    console.log('ℹ️ Verifying database records...');

    const batch = db.batch();
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      console.log('   - User document missing. Re-creating...');
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
        console.log(`   - Lookup for "${lookupId}" missing. Re-creating...`);
        batch.set(lookupDocRef, lookupData);
      }
    }
    await batch.commit();
    console.log('✅ Database records verified and synchronized.');
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('👤 Admin user not found. Creating new user...');
      try {
        const newUserRecord = await auth.createUser({
          email: adminEmail,
          emailVerified: true,
          password: adminPassword,
          displayName: 'System Admin',
          phoneNumber: `+91${adminPhone}`
        });

        console.log(`   - Auth account created with UID: ${newUserRecord.uid}.`);
        console.log('   - Creating database records...');

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
        console.log('✅ New admin user and all database records created successfully.');

      } catch (creationError) {
        console.error('❌ Failed to create new admin user:', creationError);
        process.exit(1);
      }
    } else {
      console.error('❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  }

  console.log('---');
  console.log('🔑 Admin Credentials:');
  console.log(`   Login ID: ${adminLoginId}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('---');
  console.log('🎉 Seed script finished successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
