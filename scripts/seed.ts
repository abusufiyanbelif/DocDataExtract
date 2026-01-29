import * as admin from 'firebase-admin';
import 'dotenv/config';

import { createAdminPermissions } from '../src/lib/modules';

async function main() {
  console.log('🚀 Starting Database Seed Script...');

  // Initialize Firebase Admin SDK
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.error('Please follow the instructions in the README to set up your service account.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

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

    const lookupsToVerify: {[key: string]: {email: string}} = {};
    lookupsToVerify[adminLoginId] = { email: adminEmail };
    lookupsToVerify[adminUserKey] = { email: adminEmail };
    lookupsToVerify[adminPhone] = { email: adminEmail };

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
        batch.set(lookupsRef.doc(adminLoginId), { email: adminEmail });
        batch.set(lookupsRef.doc(adminUserKey), { email: adminEmail });
        batch.set(lookupsRef.doc(adminPhone), { email: adminEmail });

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
