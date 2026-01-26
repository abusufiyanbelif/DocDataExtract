'use client';
import {
  Firestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

export const createAdminUser = async (auth: Auth) => {
    const adminEmail = 'admin@docdataextract.app';
    const adminPassword = 'password';
    
    toast({ title: "Step 1: Admin User", description: "Signing in as admin..." });

    try {
        // Attempt to sign in first, assuming the user might already exist from a previous attempt.
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        toast({ title: "Admin Sign-In Successful", description: "Admin auth account already exists. Ready to seed." });
        return;
    } catch (error: any) {
        // If sign-in fails because the user doesn't exist, then create them.
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            toast({ title: "Admin User", description: "Admin auth account not found. Creating a new one..." });
            try {
                await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                toast({ title: "Admin Account Created", description: "Successfully created and signed in as admin." });
            } catch (creationError: any) {
                console.error("Could not create admin user:", creationError);
                const message = `Could not create admin user in Auth: ${creationError.message}`;
                toast({ title: 'Auth Error', description: message, variant: 'destructive' });
                throw new Error(message);
            }
        } else if (error.code === 'auth/configuration-not-found') {
            throw error; // Re-throw to be handled by UI for specific instructions.
        } else {
            // Any other sign-in error is critical.
            console.error("Failed to sign in admin user:", error);
            const message = `An unexpected error occurred during admin sign-in: ${error.message}.`;
            toast({ title: 'Sign-In Failed', description: message, variant: 'destructive'});
            throw new Error(message);
        }
    }
}


export const seedDatabase = async (firestore: Firestore) => {
  const batch = writeBatch(firestore);
  
  toast({ title: "Step 2: Seeding Data", description: "Preparing sample data for Firestore..." });

  // Seed Users
  const adminUserDocRef = doc(collection(firestore, 'users'));
  batch.set(adminUserDocRef, {
    name: 'Admin User',
    phone: '0000000000',
    userKey: 'admin',
    role: 'Admin',
    createdAt: serverTimestamp(),
  });

  const sampleUserDocRef = doc(collection(firestore, 'users'));
  batch.set(sampleUserDocRef, {
    name: 'Sample User',
    phone: '1111111111',
    userKey: 'sampleuser',
    role: 'User',
    createdAt: serverTimestamp(),
  });

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
    status: 'Active',
    priceDate: '2025-01-11',
    shopName: 'Example Kirana Store',
    shopContact: '1234567890',
    shopAddress: '123 Main St, Hyderabad',
    rationLists: initialRationLists,
    createdAt: serverTimestamp(),
  });

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

  try {
    toast({ title: "Step 2: Seeding Data", description: "Writing data to the database... This may take a moment." });
    await batch.commit();
    toast({ title: "Step 2: Seeding Data", description: "Database write successful!" });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    const message = `Could not write to Firestore: ${error.message}`;
    toast({ title: 'Firestore Seeding Failed', description: message, variant: 'destructive'});
    // Re-throw the error so the calling function knows it failed
    throw new Error(message);
  }
};
