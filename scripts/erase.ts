
import * as admin from 'firebase-admin';
import { adminAuth, adminDb, adminStorage } from '../src/lib/firebase-admin-sdk';

const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg: string) => console.warn(`\x1b[33m⚠️ ${msg}\x1b[0m`),
  step: (num: number, title: string) => console.log(`\n\x1b[36m--- ${num}. ${title} ---\x1b[0m`),
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
};

async function main() {
  log.step(0, 'Starting Erase Script...');

  if (!adminDb || !adminAuth || !adminStorage) {
    log.error('Firebase Admin SDK not initialized. Is `serviceAccountKey.json` present? Aborting.');
    process.exit(1);
  }

  const db = adminDb;
  log.info('This script targets the "bmss-solapur-v6" Firestore database for all delete operations.');
  const storage = adminStorage.bucket();
  const auth = adminAuth;

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
        log.dim(`   - Deleted ${deletedCount} documents from "${collectionPath}".`);
    } else {
        log.dim(`   - No documents to delete in "${collectionPath}".`);
    }
  };
  
  const deleteStorageFolder = async (prefix: string) => {
    try {
      const [files] = await storage.getFiles({ prefix });
      if (files.length === 0) {
        log.dim(`   - Folder "gs://${storage.name}/${prefix}" is already empty or does not exist, skipping.`);
        return;
      }
      await storage.deleteFiles({ prefix });
      log.dim(`   - Emptied folder "gs://${storage.name}/${prefix}".`);
    } catch (e: any) {
      log.error(`   - Error emptying folder "gs://${storage.name}/${prefix}": ${e.message}`);
    }
  };

  // --- Main Erase Logic ---

  log.step(1, 'Preparing for Erase');
  let adminUid: string | null = null;
  try {
    const adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = adminUser.uid;
    log.info(`Found admin user (UID: ${adminUid}). This user's Auth entry will NOT be deleted.`);
  } catch (error) {
    log.info('No admin user found in Firebase Auth. Nothing to preserve.');
  }

  log.step(2, 'Erasing Firestore Data');
  await Promise.all([
    deleteCollection('campaigns'),
    deleteCollection('leads'),
    deleteCollection('donations'),
    deleteCollection('user_lookups'),
    deleteCollection('users', adminUid ? [adminUid] : []),
  ]);

  log.step(3, 'Erasing Non-Admin Auth Users');
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
            log.error(`   - Failed to delete auth user ${failedUser.uid}: ${err.error}`);
        });
    }
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  log.dim(`   - Deleted ${deletedAuthCount} user accounts from Firebase Authentication.`);


  log.step(4, 'Erasing Firebase Storage Data');
  await Promise.all([
      deleteStorageFolder('campaigns/'),
      deleteStorageFolder('leads/'),
      deleteStorageFolder('users/')
  ]);

  log.success('\nErase script finished successfully!');
  log.info('✨ Your database is now clean. Run `npm run db:seed` to restore the admin user\'s database records.');
}

main().catch((e) => {
  log.error('\nAn unexpected error occurred during the erase script:');
  console.error(e);
  process.exit(1);
});
