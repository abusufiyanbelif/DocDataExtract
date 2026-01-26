'use client';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  Auth,
  createUserWithEmailAndPassword,
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
    
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    // Case 1: Database is empty, and the user is trying the first-ever admin login.
    if (querySnapshot.empty && phone === '0000000000') {
        toast({
            title: 'First-Time Setup',
            description: 'Admin user not found. Attempting to create admin and seed database...',
        });

        const adminEmail = 'admin@docdataextract.app';
        // The default password for the very first admin login.
        const adminPassword = 'password'; 
        
        let userCredential;
        try {
            // First, create the admin user in Firebase Auth. This also signs them in.
            // This requires the 'Email/Password' provider to be enabled in the Firebase Console.
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            toast({ title: "Admin Account Created", description: "Successfully created admin user in Firebase Auth." });
        } catch (error: any) {
            // If it fails because the email already exists, just sign them in.
            if (error.code === 'auth/email-already-in-use') {
                try {
                    userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                } catch (signInError: any) {
                    if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
                        throw new Error("Admin user already exists in Firebase Auth, but the provided password ('password') is incorrect. Please verify the admin password in Firebase or delete the admin auth user to allow auto-recreation.");
                    }
                    throw new Error(`Admin sign-in failed: ${signInError.message}`);
                }
            } else if (error.code === 'auth/configuration-not-found') {
                // This is a critical error for first-time setup. It is caught on the login page to show a helpful message.
                throw new Error("Login failed: The Email/Password sign-in provider is not enabled in your Firebase project. Please go to the Firebase console, navigate to Authentication > Sign-in method, and enable 'Email/Password'.");
            } else {
                // For other errors (e.g., weak password), fail the process.
                throw new Error(`Could not create admin user: ${error.message}`);
            }
        }
        
        // With the admin user now authenticated, seed the Firestore database.
        try {
            await seedDatabase(firestore);
            toast({ title: "Database Seeded", description: "Initial data has been created." });
            return userCredential;
        } catch (seedError: any) {
            console.error("Database seeding failed: ", seedError);
            throw new Error("Admin login succeeded, but database seeding failed. Check console for errors.");
        }
    }

    // Case 2: User not found in a database that is NOT empty.
    if (querySnapshot.empty) {
        throw new Error('User with this phone number not found in the database.');
    }

    // Case 3: Regular user login (admin or otherwise).
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;
    const { userKey } = userData;

    if (!password) {
        throw new Error('Password is required.');
    }

    // The user's email is their unique userKey + the app domain.
    const email = `${userKey}@docdataextract.app`;

    try {
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
             throw new Error("Invalid credentials. Please ensure the user exists in Firebase Auth and the password is correct.");
        }
        throw new Error('An error occurred during sign-in.');
    }
};

export const signOut = async (auth: Auth) => {
  return firebaseSignOut(auth);
};
