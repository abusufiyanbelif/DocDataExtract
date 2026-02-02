import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectsClient } from '@google-cloud/resource-manager';

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
    console.log('\n\x1b[1m\x1b[35m🛠️ Running IAM Role Diagnostic & Fix Guidance Script...\x1b[0m');

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

    log.step(2, 'Checking Existing IAM Roles');
    
    const iamClient = new ProjectsClient();
    const serviceAccountMember = `serviceAccount:${serviceAccountEmail}`;
    let existingRoles: string[] = [];
    let missingRoles: string[] = [];

    try {
        const [policy] = await iamClient.getIamPolicy({
            resource: `projects/${projectId}`,
        });
        
        if (policy.bindings) {
             existingRoles = policy.bindings
                .filter(binding => binding.members?.includes(serviceAccountMember))
                .map(binding => binding.role)
                .filter((role): role is string => role !== null && role !== undefined);
        }

        missingRoles = ROLES_TO_ADD.filter(role => !existingRoles.includes(role));
        
        log.success('Successfully checked IAM policies.');
        log.bold('Required Roles:');
        ROLES_TO_ADD.forEach(role => log.dim(`   - ${role}`));
        
        log.bold('\nExisting Roles for Service Account:');
        if (existingRoles.length > 0) {
            existingRoles.forEach(role => log.dim(`   - ${role}`));
        } else {
            log.warn('   No roles found for this service account.');
        }

    } catch (e: any) {
        log.error(`Could not check IAM policies: ${e.message}`);
        log.warn('This might be because the account running this script does not have `resourcemanager.projects.getIamPolicy` permission.');
        log.info('Falling back to generating commands for all required roles.');
        missingRoles = ROLES_TO_ADD; // Assume all roles are missing
    }

    if (missingRoles.length === 0) {
        log.success('\n🎉 All required IAM roles are already assigned to the service account. No action needed!');
        return;
    }

    log.step(3, 'Instructions to Grant Missing Roles');
    log.warn('For security reasons, this script cannot grant IAM roles automatically.');
    log.info('You must run the following `gcloud` commands in a terminal where you have authenticated with an account that has permission to manage IAM roles (e.g., a project Owner).');
    
    console.log('\n');
    log.bold('Please copy and run the following commands in your terminal:');
    console.log('--------------------------------------------------');
    
    console.log('# 1. Ensure you are logged into gcloud:');
    log.dim('$ gcloud auth login');
    
    console.log('\n# 2. Set your current project:');
    log.dim(`$ gcloud config set project ${projectId}`);

    console.log('\n# 3. Grant the missing roles to the service account:');
    missingRoles.forEach(role => {
        const command = `gcloud projects add-iam-policy-binding ${projectId} --member="${serviceAccountMember}" --role="${role}"`;
        log.dim(`$ ${command}`);
    });
    console.log('--------------------------------------------------');
    
    log.success('\n🎉 Guidance complete! After running the commands above, your service account should have all necessary permissions.');
    log.info('You can re-run `npm run fix:iam` to verify all roles have been granted.');
}

main().catch(console.error);
