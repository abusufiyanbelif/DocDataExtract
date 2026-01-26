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
    
    // Find the user profile document in Firestore based on the phone number
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Special case for first-time admin login to an unseeded database.
        // This prompts the user to create the admin user manually in Firebase Auth.
        if (phone === '0000000000') {
             throw new Error("Admin user not found. Please create the user 'admin@docdataextract.app' in Firebase Auth, then log in and use the 'Seed Database' tool.");
        }
        throw new Error('User with this phone number not found.');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;
    const { userKey, role } = userData;

    // Use a default password for the admin user, otherwise use the provided password.
    const finalPassword = role === 'Admin' ? 'password' : password;

    if (!finalPassword) {
        throw new Error('Password is required for non-admin users.');
    }

    // We'll create a "fake" email to use with Firebase Auth, as it's required.
    const email = `${userKey}@docdataextract.app`;

    try {
        // IMPORTANT: For this demo to work, you must manually create users in your
        // Firebase Authentication console with the email format `userKey@docdataextract.app`
        // and the correct password. For the admin, the password must be 'password'.
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
