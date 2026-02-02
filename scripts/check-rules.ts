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

const FIREBASE_JSON_PATH = path.join(process.cwd(), 'firebase.json');
const FIRESTORE_RULES_PATH = path.join(process.cwd(), 'firestore.rules');
const STORAGE_RULES_PATH = path.join(process.cwd(), 'storage.rules');

function checkFirebaseJson() {
    log.step(1, 'Checking `firebase.json` Configuration');

    if (!fs.existsSync(FIREBASE_JSON_PATH)) {
        log.error('`firebase.json` not found.');
        log.info('This file is required to tell the Firebase CLI where your rules files are located.');
        log.warn('Please ensure `firebase.json` exists and is configured correctly.');
        return false;
    }

    try {
        const firebaseJson = JSON.parse(fs.readFileSync(FIREBASE_JSON_PATH, 'utf8'));
        const firestoreConfig = firebaseJson.firestore;
        const storageConfig = firebaseJson.storage;

        let hasIssues = false;
        if (!firestoreConfig || firestoreConfig.rules !== 'firestore.rules') {
            log.warn('`firebase.json` is missing or has an incorrect configuration for Firestore rules.');
            hasIssues = true;
        }
        if (!storageConfig || storageConfig.rules !== 'storage.rules') {
            log.warn('`firebase.json` is missing or has an incorrect configuration for Storage rules.');
            hasIssues = true;
        }
        
        if (hasIssues) {
            log.info('Please check that your `firebase.json` contains `{"firestore": {"rules": "firestore.rules"}, "storage": {"rules": "storage.rules"}}`');
            return false;
        }

        log.success('`firebase.json` is correctly configured for both Firestore and Storage rules.');
        return true;

    } catch (e: any) {
        log.error(`Error reading or parsing \`firebase.json\`: ${e.message}`);
        return false;
    }
}

function checkRulesFiles() {
    log.step(2, 'Checking for Rules Files');
    const firestoreExists = fs.existsSync(FIRESTORE_RULES_PATH);
    const storageExists = fs.existsSync(STORAGE_RULES_PATH);

    if (firestoreExists) {
        log.success('`firestore.rules` file found.');
    } else {
        log.error('`firestore.rules` file not found. Please ensure it exists in the project root.');
    }
    
    if (storageExists) {
        log.success('`storage.rules` file found.');
    } else {
        log.error('`storage.rules` file not found. Please ensure it exists in the project root.');
    }
}


function showDeploymentInstructions() {
     log.step(3, 'How to Deploy Your Rules');
     log.info('Since this script cannot securely authenticate to your Google Cloud project, you must deploy the rules using the Firebase CLI.');
     
     console.log('\n');
     log.bold('Please copy and run the following commands in your terminal:');
     console.log('--------------------------------------------------');
     
     console.log('# 1. If you haven\'t already, install the Firebase CLI:');
     log.dim('$ npm install -g firebase-tools');
     
     console.log('\n# 2. Log into Firebase:');
     log.dim(`$ firebase login`);

     console.log('\n# 3. Deploy the rules to your project:');
     log.dim('$ firebase deploy --only firestore:rules,storage:rules');
     
     console.log('--------------------------------------------------');
     
     log.success('\n🎉 Guidance complete! After running the commands above, your new security rules will be active.');
}

async function main() {
    console.log('\n\x1b[1m\x1b[35m🛡️ Running Security Rules Diagnostic & Guidance Script...\x1b[0m');
    checkFirebaseJson();
    checkRulesFiles();
    showDeploymentInstructions();
}

main().catch(console.error);
