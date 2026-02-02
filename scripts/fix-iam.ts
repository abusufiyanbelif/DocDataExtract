import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

// A simple logger with colors
const log = {
  info: (msg: string) => console.log(`\x1b[34mℹ️ ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg: string) => console.warn(`\x1b[33m⚠️ ${msg}\x1b[0m`),
  step: (num: number, title: string) => console.log(`\n\x1b[36m--- ${num}. ${title} ---\x1b[0m`),
  dim: (msg: string) => console.log(`\x1b[90m${msg}\x1b[0m`),
  bold: (msg: string) => console.log(`\x1b[1m${msg}\x1b[0m`),
};

const ROLES_TO_ADD = [
    'roles/firebase.admin', // For broad access to Firebase features (Auth, Firestore, etc.)
    'roles/storage.admin',  // For full control over Storage objects (uploads, deletes)
];

async function main() {
    console.log('\n\x1b[1m\x1b[35m🛠️ Running IAM Role Fix Guidance Script...\x1b[0m');

    log.step(1, 'Locating Service Account Credentials');
    
    let serviceAccount;
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    
    try {
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            log.success('`serviceAccountKey.json` found.');
        } else {
            throw new Error('`serviceAccountKey.json` not found in the project root.');
        }
    } catch (error: any) {
        log.error(error.message);
        log.info('Please download your service account key from your Firebase Project Settings > Service accounts tab and place it in the root of this project.');
        process.exit(1);
    }
    
    const serviceAccountEmail = serviceAccount.client_email;
    const projectId = serviceAccount.project_id;

    if (!serviceAccountEmail || !projectId) {
        log.error('Could not extract `client_email` or `project_id` from `serviceAccountKey.json`.');
        process.exit(1);
    }

    log.dim(`   - Project ID: ${projectId}`);
    log.dim(`   - Service Account: ${serviceAccountEmail}`);

    log.step(2, 'Instructions to Grant Required IAM Roles');
    log.info('This script generates the Google Cloud (gcloud) commands to grant your service account the permissions needed by the admin scripts.');
    log.warn('You must run these commands in a terminal where you have the Google Cloud SDK installed and are authenticated with an account that has permission to manage IAM roles (e.g., Owner or IAM Admin).');
    
    console.log('\n');
    log.bold('Please copy and run the following commands in your terminal:');
    console.log('--------------------------------------------------');
    
    console.log('# 1. Ensure you are logged into gcloud:');
    log.dim('$ gcloud auth login');
    
    console.log('\n# 2. Set your current project:');
    log.dim(`$ gcloud config set project ${projectId}`);

    console.log('\n# 3. Grant the required roles to the service account:');
    ROLES_TO_ADD.forEach(role => {
        const command = `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${serviceAccountEmail}" --role="${role}"`;
        log.dim(`$ ${command}`);
    });
    console.log('--------------------------------------------------');
    
    log.success('\n🎉 Guidance complete! After running the commands above, your service account should have all necessary permissions.');
    log.info('You can now re-run `npm run check` or `npm run check:db` to verify all connections are successful.');
}

main().catch(console.error);
