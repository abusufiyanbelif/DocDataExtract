
import * as admin from 'firebase-admin';
import 'dotenv/config';

async function main() {
  console.log('🚀 Starting Erase Script...');

  // 1. Initialize Admin SDK
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.error('This is required for admin scripts. Please follow the setup instructions.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  const db = admin.firestore();
  const storage = admin.storage().bucket();
  const auth = admin.auth();

  const BATCH_SIZE = 100;
  const ADMIN_EMAIL = 'baitulmalss.solapur@gmail.com';

  // --- Helper Functions ---
  
  const deleteCollection = async (collectionPath: string, preservedDocIds: string[] = []) => {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.limit(BATCH_SIZE);

    let deletedCount = 0;

    while (true) {
      const snapshot = await query.get();
      if (snapshot.size === 0) {
        break;
      }

      const batch = db.batch();
      let currentBatchDeletions = 0;
      snapshot.docs.forEach((doc) => {
        if (!preservedDocIds.includes(doc.id)) {
          batch.delete(doc.ref);
          currentBatchDeletions++;
        }
      });
      
      if (currentBatchDeletions > 0) {
        await batch.commit();
        deletedCount += currentBatchDeletions;
      }
      
      if (snapshot.size < BATCH_SIZE) {
        break; // All docs processed
      }
    }
    if (deletedCount > 0) {
        console.log(`   - Deleted ${deletedCount} documents from "${collectionPath}".`);
    } else {
        console.log(`   - No documents to delete in "${collectionPath}".`);
    }
  };
  
  const deleteStorageFolder = async (prefix: string) => {
    try {
      const [files] = await storage.getFiles({ prefix });
      if (files.length === 0) {
        console.log(`   - Folder "gs://${storage.name}/${prefix}" is already empty or does not exist, skipping.`);
        return;
      }
      await storage.deleteFiles({ prefix });
      console.log(`   - Emptied folder "gs://${storage.name}/${prefix}".`);
    } catch (e: any) {
      console.error(`   - ❌ Error emptying folder "gs://${storage.name}/${prefix}":`, e.message);
    }
  };

  // --- Main Erase Logic ---

  console.log('\n--- 1. Preparing for Erase ---');
  let adminUid: string | null = null;
  try {
    const adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = adminUser.uid;
    console.log(`ℹ️  Found admin user (UID: ${adminUid}). This user's Auth entry will NOT be deleted.`);
  } catch (error) {
    console.log('ℹ️  No admin user found in Firebase Auth. Nothing to preserve.');
  }

  console.log('\n--- 2. Erasing Firestore Data ---');
  await Promise.all([
    deleteCollection('campaigns'),
    deleteCollection('leads'),
    deleteCollection('donations'),
    deleteCollection('user_lookups'),
    deleteCollection('users', adminUid ? [adminUid] : []),
  ]);

  console.log('\n--- 3. Erasing Non-Admin Auth Users ---');
  let nextPageToken;
  let deletedAuthCount = 0;
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const usersToDelete = listUsersResult.users.filter(user => user.uid !== adminUid);
    if (usersToDelete.length > 0) {
        const result = await auth.deleteUsers(usersToDelete.map(u => u.uid));
        deletedAuthCount += result.successCount;
        result.errors.forEach(err => {
            const failedUser = usersToDelete[err.index];
            console.error(`   - ❌ Failed to delete auth user ${failedUser.uid}: ${err.error}`);
        });
    }
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  console.log(`   - Deleted ${deletedAuthCount} user accounts from Firebase Authentication.`);


  console.log('\n--- 4. Erasing Firebase Storage Data ---');
  await Promise.all([
      deleteStorageFolder('campaigns/'),
      deleteStorageFolder('leads/'),
      deleteStorageFolder('users/')
  ]);

  console.log('\n🎉 Erase script finished successfully!');
  console.log('✨ Your database is now clean. Run `npm run db:seed` to restore the admin user\'s database records.');
}

main().catch((e) => {
  console.error('\n❌ An unexpected error occurred during the erase script:');
  console.error(e);
  process.exit(1);
});
