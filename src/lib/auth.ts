'use client';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  Auth,
} from 'firebase/auth';
import { initialUsers } from './users';

// This is a mock authentication function.
// In a real application, you would not have users stored in a local file.
export const signInWithUserKey = async (auth: Auth, userKey: string, password?: string) => {
    const user = initialUsers.find(u => u.userKey === userKey);

    if (!user) {
        throw new Error('User not found.');
    }
    
    // In a real app, you would verify the password against a hash.
    // Here we are just checking the mock data. This is NOT secure.
    // Also, we are using the user's password from the mock file directly, which is a major security risk.
    if (user.password !== password) {
        throw new Error('Invalid password.');
    }

    // We'll create a "fake" email to use with Firebase Auth, as it's required.
    const email = `${user.userKey}@docdataextract.app`;

    try {
        // IMPORTANT: For this demo to work, you must manually create users in your
        // Firebase Authentication console with the email format `userKey@docdataextract.app`
        // and the password 'password'.
        return await signInWithEmailAndPassword(auth, email, password || '');
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
             throw new Error("Invalid user or password. Make sure the user is registered in Firebase Auth with the correct credentials.");
        }
        console.error("Firebase sign in error:", error);
        throw new Error('An error occurred during sign-in.');
    }
};

export const signOut = async (auth: Auth) => {
  return firebaseSignOut(auth);
};
