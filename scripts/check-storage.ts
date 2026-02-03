
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { adminStorage } from '../src/lib/firebase-admin-sdk';

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

// New function to summarize bucket contents
const summarizeBucketContents = async (bucket: any) => {
    const requiredFolders = ['campaigns/', 'leads/', 'users/', 'settings/'];
    log.info('Summarizing required folders...');

    for (const prefix of requiredFolders) {
        try {
            const [files, , apiResponse] = await bucket.getFiles({ prefix, delimiter: '/' });
            const subfolders = apiResponse.prefixes || [];

            // Don't count the placeholder object for the folder itself if it exists
            const fileCount = files.filter(f => f.name !== prefix).length;

            if (fileCount > 0 || subfolders.length > 0) {
                 log.dim(`📁 ${prefix}  (${subfolders.length} sub-folders, ${fileCount} files)`);
            } else {
                 log.dim(`📁 ${prefix}  (empty)`);
            }
        } catch (e: any) {
            log.error(`Could not summarize prefix "${prefix}": ${e.message}`);
        }
    }
};


async function checkStorage() {
    log.step('Checking Firebase Storage Connectivity');
    if (!adminStorage) {
        log.error('Firebase Admin SDK for Storage is not initialized.');
        log.info('This usually means `serviceAccountKey.json` is missing or has incorrect permissions.');
        throw new Error('Aborting due to uninitialized Storage SDK.');
    }
    
    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        log.dim(`Using NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${bucketName || 'Not Set'}`);
        
        if (!bucketName) {
            throw new Error('`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is not set in your .env file.');
        }

        const bucket = adminStorage.bucket();
        log.info(`Attempting to check existence of bucket "${bucket.name}"...`);
        
        const [exists] = await bucket.exists();
        
        if (exists) {
            log.success(`Successfully connected to Firebase Storage. Bucket "${bucket.name}" exists.`);

            log.step('Inspecting Bucket Contents (Summary)');
            await summarizeBucketContents(bucket);

        } else {
            throw new Error(`The bucket "${bucket.name}" does not exist in your Firebase project.`);
        }
    } catch (e: any) {
        log.error(`Firebase Storage check failed: ${e.message}`);
        if (e.message.includes('does not have storage.objects.list access') || e.message.includes('permission denied')) {
            log.info('This is a permissions issue. Go to Google Cloud IAM and ensure your service account has the "Storage Admin" or "Storage Object Admin" role.');
        } else if (e.message.includes('not set')) {
             // Already handled by the throw
        } else {
            log.info(`The bucket "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" may not exist or your service account lacks permissions to access it.`);
        }
        throw new Error('Aborting due to storage check failure.');
    }
}

async function main() {
    console.log('\n\x1b[1m\x1b[35m🛡️ Running Firebase Storage Diagnostic Check...\x1b[0m');
    
    try {
        await checkStorage();
        log.success('\n🎉 Storage diagnostics complete. All checks passed!');
    } catch (e: any) {
         log.error(`\nScript aborted: ${e.message}`);
         process.exit(1);
    }
}

main().catch(console.error);
