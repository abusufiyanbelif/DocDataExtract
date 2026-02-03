
import { adminStorage } from '../src/lib/firebase-admin-sdk';

const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  warn: (msg: string) => console.warn(`\x1b[33m⚠️ ${msg}\x1b[0m`),
  step: (num: number, title: string) => console.log(`\n\x1b[36m--- ${num}. ${title} ---\x1b[0m`),
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
};

async function createPlaceholder(folderPath: string) {
    if (!adminStorage) {
        throw new Error('Admin Storage not initialized.');
    }
    const bucket = adminStorage.bucket();
    const file = bucket.file(`${folderPath}.placeholder`);
    const [exists] = await file.exists();
    if (exists) {
        log.dim(`   - Folder "${folderPath}" already exists. Skipping.`);
    } else {
        await file.save('', {
            contentType: 'text/plain',
        });
        log.success(`   - Created placeholder for "${folderPath}".`);
    }
}

async function main() {
    log.step(1, 'Setting up Firebase Storage Folder Structure');
    log.info('This script will create empty placeholder files to ensure the main folders exist in your bucket.');
    
    if (!adminStorage) {
        log.warn('Could not initialize Firebase Storage. Is `serviceAccountKey.json` configured?');
        process.exit(1);
    }
    
    const requiredFolders = ['campaigns/', 'leads/', 'settings/', 'users/'];

    try {
        for (const folder of requiredFolders) {
            await createPlaceholder(folder);
        }
        log.success('\n🎉 Storage folder setup complete!');
    } catch(e: any) {
        console.error('An error occurred during storage setup:', e.message);
        process.exit(1);
    }
}

main().catch(console.error);
