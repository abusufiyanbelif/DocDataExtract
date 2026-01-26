'use client';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  Auth,
} from 'firebase/auth';
import { 
    Firestore, 
    collection, 
    query, 
    where, 
    getDocs 
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { seedDatabase } from './seed';
import { toast } from '@/hooks/use-toast';

export const signInWithPhone = async (auth: Auth, firestore: Firestore, phone: string, password?: string) => {
    
    // The security rules need to allow this read for login to work.
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    // Case 1: Database is empty and it's the first admin login
    if (querySnapshot.empty && phone === '0000000000') {
        toast({
            title: 'First-Time Setup',
            description: 'Database is empty. Attempting to sign in as admin and seed database...',
        });

        // First, prove identity by signing into Firebase Auth as admin
        const adminEmail = 'admin@docdataextract.app';
        const adminPassword = 'password';
        
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (error: any) {
             console.error("Admin Auth failed:", error);
             throw new Error("Admin login failed. Please ensure 'admin@docdataextract.app' user is created in Firebase Authentication with the password 'password'.");
        }
        
        // If auth is successful, seed the database
        try {
            await seedDatabase(firestore);
            toast({ title: "Database Seeded", description: "Initial data has been created." });
            // Login is already complete.
            return userCredential;
        } catch (seedError: any) {
            console.error("Database seeding failed:", seedError);
            throw new Error("Admin login succeeded, but database seeding failed. Check console for errors.");
        }
    }

    // Case 2: User not found in (non-empty) database
    if (querySnapshot.empty) {
        throw new Error('User with this phone number not found in the database.');
    }

    // Case 3: Regular login
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;
    const { userKey, role } = userData;

    // Use a default password for the admin user, otherwise use the provided password.
    const finalPassword = role === 'Admin' ? 'password' : password;

    if (!finalPassword) {
        throw new Error('Password is required for non-admin users.');
    }

    const email = `${userKey}@docdataextract.app`;

    try {
        return await signInWithEmailAndPassword(auth, email, finalPassword);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
             throw new Error("Invalid credentials. Please ensure the user exists in Firebase Auth and the password is correct.");
        }
        console.error("Firebase sign in error:", error);
        throw new Error('An error occurred during sign-in.');
    }
};

export const signOut = async (auth: Auth) => {
  return firebaseSignOut(auth);
};
