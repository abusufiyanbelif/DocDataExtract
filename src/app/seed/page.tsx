'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useStorage }from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { writeBatch, doc, collection, serverTimestamp, getDocs, query, where, limit, getDoc } from 'firebase/firestore';
import { modules, permissions } from '@/lib/modules';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SeedPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [errorOccurred, setErrorOccurred] = useState(false);

    const log = (message: string) => {
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };
    
    const createPlaceholderFile = async (path: string) => {
        if (!storage) throw new Error("Storage service not available.");
        try {
            const placeholderRef = storageRef(storage, path);
            await uploadBytes(placeholderRef, new Uint8Array());
            log(`   -> SUCCESS: Ensured storage path: gs://${placeholderRef.bucket}/${placeholderRef.fullPath}`);
        } catch (error: any) {
            log(`   -> ❌ ERROR creating placeholder at ${path}.`);
            // Re-throw the error to be caught by the main handler
            throw error;
        }
    };
    
    const testStoragePermissions = async () => {
        if (!storage) throw new Error("Storage service not available.");
        log(" -> Testing Storage write permissions...");
        const testFile = `diagnostics/seed_test_${Date.now()}.txt`;
        const testFileRef = storageRef(storage, testFile);
        try {
            await uploadBytes(testFileRef, new Blob(['test']));
            log("   -> Write permissions test successful.");
            await deleteObject(testFileRef);
            log("   -> Cleaned up test file.");
            return true;
        } catch (error: any) {
             const storageRulesUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/storage/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/rules`;
            let errorMessage = `Storage write permission test failed. This is likely a security rules issue. (Code: ${error.code || 'unknown'})`;
            log(`❌ ERROR: ${errorMessage}`);
            log('------------------------------------------');
            log('SOLUTION: Go to the Storage Rules editor in your Firebase console and ensure authenticated users can write.');
            log('Paste the following rules and click "Publish":');
            log(`
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
            `);
            log(`Link to rules: ${storageRulesUrl}`);
            log('------------------------------------------');
            throw new Error(errorMessage);
        }
    }

    const createAdminUser = async () => {
        if (!auth) throw new Error("Auth service not available.");
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
                    throw new Error(`Could not create admin user in Auth: ${creationError.message}`);
                }
            } else if (error.code === 'auth/configuration-not-found') {
                const authUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/sign-in-method`;
                log(`❌ ERROR: Firebase auth is not configured to allow email/password sign-in.`);
                log(`SOLUTION: Please enable it in the Firebase Console: ${authUrl}`);
                throw new Error("Firebase auth is not configured to allow email/password sign-in. Please enable it in the Firebase Console.");
            } else {
                throw new Error(`An unexpected error occurred during admin sign-in: ${error.message}.`);
            }
        }
    };
    
    const seedDatabase = async () => {
        if (!firestore || !storage) throw new Error("Firestore or Storage service not available.");
        const batch = writeBatch(firestore);
        
        log("Step 2: Seeding Firestore Data & Storage Folders");

        // Define full permissions for the Admin role
        const allPermissions: any = {};
        for (const mod of modules) {
            allPermissions[mod.id] = {};
            for (const perm of permissions) {
                allPermissions[mod.id][perm] = true;
            }
        }
        
        // --- User Seeding ---
        log(" -> Checking for existing users to prevent duplicates...");
        const usersCollectionRef = collection(firestore, 'users');
        const allUsersSnapshot = await getDocs(usersCollectionRef);
        const allUsers = allUsersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as UserProfile & {id: string});

        // Admin User Data
        const adminData = { name: 'Admin User', phone: '0000000000', loginId: 'admin', userKey: 'admin', role: 'Admin', status: 'Active', permissions: allPermissions, };

        // Check for admin user conflicts
        const adminExists = allUsers.some(u => u.userKey === adminData.userKey);
        if (adminExists) {
            log(" -> Admin user profile (userKey: 'admin') already exists in Firestore. Skipping.");
        } else {
             const conflict = allUsers.find(u => u.loginId === adminData.loginId || u.phone === adminData.phone || u.name === adminData.name);
            if (conflict) {
                let field = 'details';
                if (conflict.loginId === adminData.loginId) field = `Login ID '${adminData.loginId}'`;
                else if (conflict.phone === adminData.phone) field = `Phone '${adminData.phone}'`;
                else if (conflict.name === adminData.name) field = `Name '${adminData.name}'`;
                throw new Error(`Cannot seed admin user: a different user already exists with the ${field}. Please resolve manually.`);
            }
            log(" -> Admin user profile not found. Preparing to create...");
            const newAdminUserRef = doc(usersCollectionRef); // Create a new doc ref
            batch.set(newAdminUserRef, { ...adminData, createdAt: serverTimestamp() });
            log(" -> Admin user data prepared for batch write.");
        }

        // Sample User Data
        const sampleUserData = { name: 'Sample User', phone: '1111111111', loginId: 'sampleuser', userKey: 'sampleuser', role: 'User', status: 'Active', permissions: {}, };
        
        const sampleUserExists = allUsers.some(u => u.userKey === sampleUserData.userKey);
        if (sampleUserExists) {
            log(" -> Sample user profile (userKey: 'sampleuser') already exists in Firestore. Skipping.");
        } else {
            const conflict = allUsers.find(u => u.loginId === sampleUserData.loginId || u.phone === sampleUserData.phone || u.name === sampleUserData.name);
            if (conflict) {
                let field = 'details';
                if (conflict.loginId === sampleUserData.loginId) field = `Login ID '${sampleUserData.loginId}'`;
                else if (conflict.phone === sampleUserData.phone) field = `Phone '${sampleUserData.phone}'`;
                else if (conflict.name === sampleUserData.name) field = `Name '${sampleUserData.name}'`;
                throw new Error(`Cannot seed sample user: a different user already exists with the ${field}. Please resolve manually.`);
            }
            log(" -> Sample user profile not found. Preparing to create...");
            const newSampleUserRef = doc(usersCollectionRef); // Create a new doc ref
            batch.set(newSampleUserRef, { ...sampleUserData, createdAt: serverTimestamp() });
            log(" -> Sample user data prepared for batch write.");
        }
        
        // --- Create Storage Folders ---
        log(" -> Creating root folders in Firebase Storage...");
        await createPlaceholderFile('campaigns/.placeholder');
        await createPlaceholderFile('users/.placeholder');

        // Seed Campaign and related data idempotently
        const campaignId = 'ration-kit-distribution-ramza-2026';
        const campaignName = 'Ration Kit Distribution Ramza 2026';
        const campaignDocRef = doc(firestore, 'campaigns', campaignId);
        
        const campaignDocSnapshot = await getDoc(campaignDocRef);
        
        if (!campaignDocSnapshot.exists()) {
            log(" -> Sample campaign not found. Preparing to create campaign and related data...");
            
            batch.set(campaignDocRef, { name: campaignName, description: 'A sample campaign for distributing ration kits to those in need during the holy month of Ramza.', targetAmount: 100000, status: 'Active', startDate: '2026-03-01', endDate: '2026-03-31', priceDate: '2025-01-11', shopName: 'Example Kirana Store', shopContact: '1234567890', shopAddress: '123 Main St, Hyderabad', rationLists: { 'General': [{ id: 'General-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: 'General-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: 'General-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: 'General-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: 'General-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: 'General-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: 'General-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: 'General-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: 'General-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: 'General-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: 'General-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: 'General-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },], '5': [{ id: '5-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: '5-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: '5-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: '5-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: '5-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: '5-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: '5-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: '5-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: '5-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: '5-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: '5-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: '5-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },], '3': [{ id: '3-1', name: 'Rice', quantity: '6 kg', price: 360, notes: '@60/kg' }, { id: '3-2', name: 'Wheat flour', quantity: '3 kg', price: 150, notes: 'Ashirvad' }, { id: '3-3', name: 'Tea', quantity: '150 gm', price: 60, notes: 'Society mix' }, { id: '3-4', name: 'Sugar', quantity: '1.5 kg', price: 66, notes: '@44/kg' }, { id: '3-5', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },], '2': [{ id: '2-1', name: 'Rice', quantity: '4 kg', price: 240, notes: '@60/kg' }, { id: '2-2', name: 'Wheat flour', quantity: '2 kg', price: 100, notes: 'Ashirvad' }, { id: '2-3', name: 'Sugar', quantity: '1 kg', price: 44, notes: '@44/kg' }, { id: '2-4', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },], '1': [{ id: '1-1', name: 'Rice', quantity: '2 kg', price: 120, notes: '@60/kg' }, { id: '1-2', name: 'Wheat flour', quantity: '1 kg', price: 50, notes: 'Ashirvad' }, { id: '1-3', name: 'Sugar', quantity: '0.5 kg', price: 22, notes: '@44/kg' },], }, createdAt: serverTimestamp(), });
            
            await createPlaceholderFile(`campaigns/${campaignId}/beneficiaries/.placeholder`);
            await createPlaceholderFile(`campaigns/${campaignId}/donations/.placeholder`);
            log(" -> Campaign data prepared for batch write.");

            const initialBeneficiaries = [ { id: '1', name: 'Saleem Khan', address: '123, Old City, Hyderabad', phone: '9876543210', members: 5, earningMembers: 1, male: 2, female: 3, addedDate: '2026-03-15', idProofType: 'Aadhaar', idNumber: 'XXXX XXXX 1234', referralBy: 'Local NGO', kitAmount: 2058, status: 'Given' }, { id: '2', name: 'Aisha Begum', address: '456, New Town, Hyderabad', phone: '9876543211', members: 4, earningMembers: 2, male: 2, female: 2, addedDate: '2026-03-16', idProofType: 'PAN', idNumber: 'ABCDE1234F', referralBy: 'Masjid Committee', kitAmount: 1000, status: 'Pending' }, { id: '3', name: 'Mohammed Ali', address: '789, Charminar, Hyderabad', phone: '9876543212', members: 6, earningMembers: 1, male: 3, female: 3, addedDate: '2026-03-17', idProofType: 'Voter ID', idNumber: 'XYZ1234567', referralBy: 'Self', kitAmount: 2058, status: 'Hold' }, { id: '4', name: 'Fatima Sheikh', address: '101, Golconda, Hyderabad', phone: '9876543213', members: 3, earningMembers: 0, male: 1, female: 2, addedDate: '2026-03-18', idProofType: 'Aadhaar', idNumber: 'YYYY YYYY 5678', referralBy: 'Local NGO', kitAmount: 696, status: 'Need More Details' }, ];
            initialBeneficiaries.forEach((beneficiary) => {
                batch.set(doc(firestore, `campaigns/${campaignId}/beneficiaries`, beneficiary.id), { ...beneficiary, createdAt: serverTimestamp() });
            });
            log(" -> Beneficiary data prepared for batch write.");

            const initialDonations = [ { donorName: 'Zoya Farooqui', donorPhone: '9988776655', amount: 5000, type: 'Zakat', donationDate: '2026-03-10', status: 'Verified', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName }, { donorName: 'Rohan Sharma', donorPhone: '9988776654', amount: 1000, type: 'General', donationDate: '2026-03-12', status: 'Verified', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName }, { donorName: 'Anonymous', donorPhone: '9988776653', amount: 2500, type: 'Sadqa', donationDate: '2026-03-14', status: 'Pending', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName }, ];
            initialDonations.forEach((donation) => {
                batch.set(doc(collection(firestore, 'donations')), { ...donation, createdAt: serverTimestamp() });
            });
            log(" -> Donation data prepared for batch write.");

        } else {
            log(" -> Sample campaign and related data already exist. Skipping.");
        }

        log(" -> Committing all changes to the database...");
        await batch.commit();
        log(" -> Database write successful!");
    };
    
    const handleSeed = async () => {
        setIsSeeding(true);
        setErrorOccurred(false);
        setLogs([]);
        log('Starting database seeding script...');

        if (!auth || !firestore || !storage) {
            log('❌ ERROR: Firebase services are not available. Please check your configuration.');
            setErrorOccurred(true);
            toast({ title: 'Seeding Failed', description: 'Firebase services are not available.', variant: 'destructive', });
            setIsSeeding(false);
            return;
        }

        try {
            await createAdminUser();
            await testStoragePermissions();
            await seedDatabase();
            log('✅ Seeding script completed successfully.');
            toast({ title: 'Seeding Successful', description: 'The database has been initialized with sample data.', variant: 'default' });
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.';
            log(`❌ FAILED: ${errorMessage}`);
            setErrorOccurred(true);
            // The specific error toast is now handled inside the functions
            if (!errorMessage.includes('permission')) {
                 toast({ title: 'Seeding Failed', description: 'An error occurred. Check the logs for details.', variant: 'destructive' });
            }
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </Button>
                </div>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Database Seeding</CardTitle>
                        <CardDescription>This page allows you to initialize the Firestore database and Storage with sample data. This action is idempotent and safe to run multiple times.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={handleSeed} disabled={isSeeding}>
                                {isSeeding ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <PlayCircle className="mr-2 h-4 w-4" /> )}
                                Seed Database
                            </Button>
                             <Button variant="secondary" asChild>
                                <Link href="/diagnostics">
                                    Run System Diagnostics
                                </Link>
                            </Button>
                        </div>
                        
                         {errorOccurred && (
                            <Alert variant="destructive">
                                <AlertTitle>Seeding Failed</AlertTitle>
                                <AlertDescription>
                                    An error occurred during the seeding process. Please review the logs below. If the error is related to permissions, the log will contain a link and instructions to fix your security rules.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {logs.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Logs:</h3>
                                <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-code max-h-80">
                                    {logs.join('\n')}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
