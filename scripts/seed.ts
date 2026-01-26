import { config } from 'dotenv';
// Load environment variables from .env file
config();

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { modules, permissions } from '@/lib/modules';

// Firebase config is read from environment variables
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const log = (message: string) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
};

const createAdminUser = async (auth: any, log: (message: string) => void) => {
    const adminEmail = 'admin@docdataextract.app';
    const adminPassword = 'password';
    
    log("Step 1: Admin User Setup");

    try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        log(" -> Admin auth account already exists. Sign-in successful.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            log(" -> Admin auth account not found. Creating a new one...");
            try {
                await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                log(" -> Successfully created admin user in Firebase Auth.");
            } catch (creationError: any) {
                const message = `Could not create admin user in Auth: ${creationError.message}`;
                log(`ERROR: ${message}`);
                throw new Error(message);
            }
        } else {
            const message = `An unexpected error occurred during admin sign-in: ${error.message}.`;
            log(`ERROR: ${message}`);
            throw new Error(message);
        }
    }
};

const seedDatabase = async (firestore: any, log: (message: string) => void) => {
    const batch = writeBatch(firestore);
    
    log("Step 2: Seeding Firestore Data");
    log(" -> Preparing sample data...");

    // Define full permissions for the Admin role
    const allPermissions: any = {};
    for (const mod of modules) {
        allPermissions[mod.id] = {};
        for (const perm of permissions) {
            allPermissions[mod.id][perm] = true;
        }
    }

    // Seed Users
    const adminUserDocRef = doc(collection(firestore, 'users'));
    batch.set(adminUserDocRef, {
        name: 'Admin User',
        phone: '0000000000',
        loginId: 'admin',
        userKey: 'admin',
        role: 'Admin',
        status: 'Active',
        permissions: allPermissions,
        createdAt: serverTimestamp(),
    });

    const sampleUserDocRef = doc(collection(firestore, 'users'));
    batch.set(sampleUserDocRef, {
        name: 'Sample User',
        phone: '1111111111',
        loginId: 'sampleuser',
        userKey: 'sampleuser',
        role: 'User',
        status: 'Active',
        permissions: {},
        createdAt: serverTimestamp(),
    });

    log(" -> User data prepared.");

    // Seed Campaign
    const campaignId = 'ration-kit-distribution-ramza-2026';
    const campaignRef = doc(firestore, 'campaigns', campaignId);
    const initialRationLists = {
        'General': [{ id: 'General-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: 'General-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: 'General-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: 'General-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: 'General-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: 'General-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: 'General-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: 'General-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: 'General-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: 'General-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: 'General-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: 'General-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
        '5': [{ id: '5-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: '5-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: '5-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: '5-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: '5-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: '5-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: '5-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: '5-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: '5-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: '5-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: '5-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: '5-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
        '3': [{ id: '3-1', name: 'Rice', quantity: '6 kg', price: 360, notes: '@60/kg' }, { id: '3-2', name: 'Wheat flour', quantity: '3 kg', price: 150, notes: 'Ashirvad' }, { id: '3-3', name: 'Tea', quantity: '150 gm', price: 60, notes: 'Society mix' }, { id: '3-4', name: 'Sugar', quantity: '1.5 kg', price: 66, notes: '@44/kg' }, { id: '3-5', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
        '2': [{ id: '2-1', name: 'Rice', quantity: '4 kg', price: 240, notes: '@60/kg' }, { id: '2-2', name: 'Wheat flour', quantity: '2 kg', price: 100, notes: 'Ashirvad' }, { id: '2-3', name: 'Sugar', quantity: '1 kg', price: 44, notes: '@44/kg' }, { id: '2-4', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
        '1': [{ id: '1-1', name: 'Rice', quantity: '2 kg', price: 120, notes: '@60/kg' }, { id: '1-2', name: 'Wheat flour', quantity: '1 kg', price: 50, notes: 'Ashirvad' }, { id: '1-3', name: 'Sugar', quantity: '0.5 kg', price: 22, notes: '@44/kg' },],
    };
    batch.set(campaignRef, {
        name: 'Ration Kit Distribution Ramza 2026',
        description: 'A sample campaign for distributing ration kits to those in need during the holy month of Ramza.',
        targetAmount: 100000,
        status: 'Active',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        priceDate: '2025-01-11',
        shopName: 'Example Kirana Store',
        shopContact: '1234567890',
        shopAddress: '123 Main St, Hyderabad',
        rationLists: initialRationLists,
        createdAt: serverTimestamp(),
    });
    log(" -> Campaign data prepared.");

    // Seed Beneficiaries
    const initialBeneficiaries = [
        { id: '1', name: 'Saleem Khan', address: '123, Old City, Hyderabad', phone: '9876543210', members: 5, earningMembers: 1, male: 2, female: 3, addedDate: '2026-03-15', idProofType: 'Aadhaar', idNumber: 'XXXX XXXX 1234', referralBy: 'Local NGO', kitAmount: 2058, status: 'Given' },
        { id: '2', name: 'Aisha Begum', address: '456, New Town, Hyderabad', phone: '9876543211', members: 4, earningMembers: 2, male: 2, female: 2, addedDate: '2026-03-16', idProofType: 'PAN', idNumber: 'ABCDE1234F', referralBy: 'Masjid Committee', kitAmount: 1000, status: 'Pending' },
        { id: '3', name: 'Mohammed Ali', address: '789, Charminar, Hyderabad', phone: '9876543212', members: 6, earningMembers: 1, male: 3, female: 3, addedDate: '2026-03-17', idProofType: 'Other', idNumber: 'Voter ID', referralBy: 'Self', kitAmount: 2058, status: 'Hold' },
        { id: '4', name: 'Fatima Sheikh', address: '101, Golconda, Hyderabad', phone: '9876543213', members: 3, earningMembers: 0, male: 1, female: 2, addedDate: '2026-03-18', idProofType: 'Aadhaar', idNumber: 'YYYY YYYY 5678', referralBy: 'Local NGO', kitAmount: 696, status: 'Need More Details' },
    ];
    initialBeneficiaries.forEach((beneficiary) => {
        const { id, ...beneficiaryData } = beneficiary;
        const beneficiaryRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, id);
        batch.set(beneficiaryRef, { ...beneficiaryData, createdAt: serverTimestamp() });
    });
    log(" -> Beneficiary data prepared.");

    try {
        log(" -> Writing data to the database... This may take a moment.");
        await batch.commit();
        log(" -> Database write successful!");
    } catch (error: any) {
        const message = `Could not write to Firestore: ${error.message}`;
        log(`ERROR: ${message}`);
        throw new Error(message);
    }
};

const run = async () => {
    log('Starting database seeding script...');

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.apiKey.includes('your-api-key')) {
    console.error('\nERROR: Firebase configuration is missing.');
    console.error('Please copy the values from your Firebase project console into your .env file.\n');
    return;
    }
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    try {
    await createAdminUser(auth, log);
    await seedDatabase(firestore, log);
    log('✅ Seeding script completed successfully.');
    } catch (e) {
    console.error('\n❌ Seeding script failed.');
    console.error(e);
    }
};

run();
