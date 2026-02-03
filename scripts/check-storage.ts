
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

// Recursive function to provide a detailed view of the storage bucket structure.
const listFilesAndFolders = async (bucket: any, prefix = '', indent = '') => {
    try {
        const [files, , apiResponse] = await bucket.getFiles({ prefix, delimiter: '/' });
        const subfolders = apiResponse.prefixes || [];

        // Display subfolders
        for (const folderPrefix of subfolders) {
            const folderName = folderPrefix.substring(prefix.length).replace(/\/$/, '');
            if (folderName) {
                log.dim(`${indent}📁 ${folderName}/`);
                // Recurse into subfolder
                await listFilesAndFolders(bucket, folderPrefix, indent + '  ');
            }
        }

        // Display files in the current folder
        for (const file of files) {
            // Don't show the "folder" placeholder object itself
            if (file.name.endsWith('/') && file.name === prefix) continue;

            const fileName = file.name.substring(prefix.length);
            if (fileName) {
                 const sizeInKb = file.metadata.size ? (Number(file.metadata.size) / 1024).toFixed(2) : '0.00';
                 const created = new Date(file.metadata.timeCreated).toISOString();
                 const updated = new Date(file.metadata.updated).toISOString();
                 const metadataString = `(size: ${sizeInKb} KB, type: ${file.metadata.contentType}, created: ${created}, updated: ${updated})`;
                 log.dim(`${indent}📄 ${fileName} ${metadataString}`);
            }
        }

    } catch (e: any) {
        log.error(`${indent}Could not list contents for prefix "${prefix}": ${e.message}`);
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

            log.step('Inspecting Bucket Contents (Full Structure)');
            await listFilesAndFolders(bucket);

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
