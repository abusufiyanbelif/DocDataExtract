'use client';

import { useState } from 'react';
import { useAuth, useFirestore }from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { writeBatch, doc, collection, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { modules, permissions } from '@/lib/modules';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const log = (message: string) => {
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

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
                    const message = `Could not create admin user in Auth: ${creationError.message}`;
                    log(`ERROR: ${message}`);
                    throw new Error(message);
                }
            } else if (error.code === 'auth/configuration-not-found') {
                log('ERROR: Firebase auth is not configured to allow email/password sign-in.');
                throw error;
            } else {
                const message = `An unexpected error occurred during admin sign-in: ${error.message}.`;
                log(`ERROR: ${message}`);
                throw new Error(message);
            }
        }
    };
    
    const seedDatabase = async () => {
        if (!firestore) throw new Error("Firestore service not available.");
        const batch = writeBatch(firestore);
        
        log("Step 2: Seeding Firestore Data");

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
        const adminData = {
            name: 'Admin User',
            phone: '0000000000',
            loginId: 'admin',
            userKey: 'admin',
            role: 'Admin',
            status: 'Active',
            permissions: allPermissions,
        };

        // Check for admin user conflicts
        const existingAdmin = allUsers.find(u => u.userKey === adminData.userKey);
        if (existingAdmin) {
            log(" -> Admin user (userKey: 'admin') already exists. Skipping.");
        } else {
            const conflict = allUsers.find(u => u.loginId === adminData.loginId || u.phone === adminData.phone || u.name === adminData.name);
            if (conflict) {
                let field = 'details';
                if (conflict.loginId === adminData.loginId) field = `Login ID '${adminData.loginId}'`;
                else if (conflict.phone === adminData.phone) field = `Phone '${adminData.phone}'`;
                else if (conflict.name === adminData.name) field = `Name '${adminData.name}'`;
                const message = `Cannot seed admin user: a different user already exists with the ${field}. Please resolve manually.`;
                log(`ERROR: ${message}`);
                throw new Error(message);
            }
            log(" -> Admin user not found. Preparing to create...");
            const adminUserDocRef = doc(usersCollectionRef);
            batch.set(adminUserDocRef, { ...adminData, createdAt: serverTimestamp() });
            log(" -> Admin user data prepared.");
        }

        // Sample User Data
        const sampleUserData = {
            name: 'Sample User',
            phone: '1111111111',
            loginId: 'sampleuser',
            userKey: 'sampleuser',
            role: 'User',
            status: 'Active',
            permissions: {},
        };

        // Check for sample user conflicts
        const existingSampleUser = allUsers.find(u => u.userKey === sampleUserData.userKey);
        if (existingSampleUser) {
            log(" -> Sample user (userKey: 'sampleuser') already exists. Skipping.");
        } else {
            const conflict = allUsers.find(u => u.loginId === sampleUserData.loginId || u.phone === sampleUserData.phone || u.name === sampleUserData.name);
            if (conflict) {
                let field = 'details';
                if (conflict.loginId === sampleUserData.loginId) field = `Login ID '${sampleUserData.loginId}'`;
                else if (conflict.phone === sampleUserData.phone) field = `Phone '${sampleUserData.phone}'`;
                else if (conflict.name === sampleUserData.name) field = `Name '${sampleUserData.name}'`;
                const message = `Cannot seed sample user: a different user already exists with the ${field}. Please resolve manually.`;
                log(`ERROR: ${message}`);
                throw new Error(message);
            }
            log(" -> Sample user not found. Preparing to create...");
            const sampleUserDocRef = doc(usersCollectionRef);
            batch.set(sampleUserDocRef, { ...sampleUserData, createdAt: serverTimestamp() });
            log(" -> Sample user data prepared.");
        }
        
        // Seed Campaign and related data idempotently
        const campaignId = 'ration-kit-distribution-ramza-2026';
        const campaignName = 'Ration Kit Distribution Ramza 2026';
        const campaignDocRef = doc(firestore, 'campaigns', campaignId);
        
        const campaignDocSnapshot = await getDocs(query(collection(firestore, 'campaigns'), where('__name__', '==', campaignId), limit(1)));
        
        if (campaignDocSnapshot.empty) {
            log(" -> Sample campaign not found. Preparing to create campaign and related data...");
            
            const initialRationLists = {
                'General': [{ id: 'General-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: 'General-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: 'General-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: 'General-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: 'General-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: 'General-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: 'General-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: 'General-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: 'General-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: 'General-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: 'General-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: 'General-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
                '5': [{ id: '5-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: '5-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: '5-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: '5-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: '5-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: '5-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: '5-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: '5-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: '5-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: '5-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: '5-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: '5-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
                '3': [{ id: '3-1', name: 'Rice', quantity: '6 kg', price: 360, notes: '@60/kg' }, { id: '3-2', name: 'Wheat flour', quantity: '3 kg', price: 150, notes: 'Ashirvad' }, { id: '3-3', name: 'Tea', quantity: '150 gm', price: 60, notes: 'Society mix' }, { id: '3-4', name: 'Sugar', quantity: '1.5 kg', price: 66, notes: '@44/kg' }, { id: '3-5', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
                '2': [{ id: '2-1', name: 'Rice', quantity: '4 kg', price: 240, notes: '@60/kg' }, { id: '2-2', name: 'Wheat flour', quantity: '2 kg', price: 100, notes: 'Ashirvad' }, { id: '2-3', name: 'Sugar', quantity: '1 kg', price: 44, notes: '@44/kg' }, { id: '2-4', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
                '1': [{ id: '1-1', name: 'Rice', quantity: '2 kg', price: 120, notes: '@60/kg' }, { id: '1-2', name: 'Wheat flour', quantity: '1 kg', price: 50, notes: 'Ashirvad' }, { id: '1-3', name: 'Sugar', quantity: '0.5 kg', price: 22, notes: '@44/kg' },],
            };
            batch.set(campaignDocRef, {
                name: campaignName,
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

            // Seed Beneficiaries for the new campaign
            const initialBeneficiaries = [
                { id: '1', name: 'Saleem Khan', address: '123, Old City, Hyderabad', phone: '9876543210', members: 5, earningMembers: 1, male: 2, female: 3, addedDate: '2026-03-15', idProofType: 'Aadhaar', idNumber: 'XXXX XXXX 1234', referralBy: 'Local NGO', kitAmount: 2058, status: 'Given' },
                { id: '2', name: 'Aisha Begum', address: '456, New Town, Hyderabad', phone: '9876543211', members: 4, earningMembers: 2, male: 2, female: 2, addedDate: '2026-03-16', idProofType: 'PAN', idNumber: 'ABCDE1234F', referralBy: 'Masjid Committee', kitAmount: 1000, status: 'Pending' },
                { id: '3', name: 'Mohammed Ali', address: '789, Charminar, Hyderabad', phone: '9876543212', members: 6, earningMembers: 1, male: 3, female: 3, addedDate: '2026-03-17', idProofType: 'Voter ID', idNumber: 'XYZ1234567', referralBy: 'Self', kitAmount: 2058, status: 'Hold' },
                { id: '4', name: 'Fatima Sheikh', address: '101, Golconda, Hyderabad', phone: '9876543213', members: 3, earningMembers: 0, male: 1, female: 2, addedDate: '2026-03-18', idProofType: 'Aadhaar', idNumber: 'YYYY YYYY 5678', referralBy: 'Local NGO', kitAmount: 696, status: 'Need More Details' },
            ];
            initialBeneficiaries.forEach((beneficiary) => {
                const { id, ...beneficiaryData } = beneficiary;
                const beneficiaryRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, id);
                batch.set(beneficiaryRef, { ...beneficiaryData, createdAt: serverTimestamp() });
            });
            log(" -> Beneficiary data prepared.");

            // Seed Donations for the new campaign
            const initialDonations = [
                { donorName: 'Zoya Farooqui', donorPhone: '9988776655', amount: 5000, type: 'Zakat', donationDate: '2026-03-10', status: 'Verified', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName },
                { donorName: 'Rohan Sharma', donorPhone: '9988776654', amount: 1000, type: 'General', donationDate: '2026-03-12', status: 'Verified', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName },
                { donorName: 'Anonymous', donorPhone: '9988776653', amount: 2500, type: 'Sadqa', donationDate: '2026-03-14', status: 'Pending', uploadedBy: 'Admin User', uploadedById: 'admin', campaignId: campaignId, campaignName: campaignName },
            ];

            initialDonations.forEach((donation) => {
                const donationRef = doc(collection(firestore, 'donations'));
                batch.set(donationRef, { ...donation, createdAt: serverTimestamp() });
            });
            log(" -> Donation data prepared.");

        } else {
            log(" -> Sample campaign and related data already exist. Skipping.");
        }


        try {
            log(" -> Committing all changes to the database... This may take a moment.");
            await batch.commit();
            log(" -> Database write successful!");
        } catch (error: any) {
            const message = `Could not write to Firestore: ${error.message}`;
            log(`ERROR: ${message}`);
            throw new Error(message);
        }
    };
    
    const handleSeed = async () => {
        setIsSeeding(true);
        setLogs([]);
        log('Starting database seeding script...');

        if (!auth || !firestore) {
            log('ERROR: Firebase services are not available. Please check your configuration.');
            toast({
                title: 'Seeding Failed',
                description: 'Firebase services are not available.',
                variant: 'destructive',
            });
            setIsSeeding(false);
            return;
        }

        try {
            await createAdminUser();
            await seedDatabase();
            log('✅ Seeding script completed successfully.');
            toast({
                title: 'Seeding Successful',
                description: 'The database has been initialized with sample data.',
            });
        } catch (e: any) {
            log('❌ Seeding script failed.');
            if (e.message) {
              log(e.message);
            }
            if (e.code === 'auth/configuration-not-found') {
                toast({
                    title: 'Action Required',
                    description: "Enable 'Email/Password' provider in Firebase Auth console.",
                    variant: 'destructive',
                    duration: 9000,
                });
            } else {
                toast({
                    title: 'Seeding Failed',
                    description: e.message || 'An unknown error occurred.',
                    variant: 'destructive',
                });
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
                        <CardDescription>This page allows you to initialize the Firestore database with sample data. This is useful for first-time setup or for resetting the data to a known state. This action is irreversible.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button onClick={handleSeed} disabled={isSeeding}>
                            {isSeeding ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <PlayCircle className="mr-2 h-4 w-4" />
                            )}
                            Seed Database
                        </Button>
                        
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
