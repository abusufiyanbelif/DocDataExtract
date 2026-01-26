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

export const signInWithPhone = async (auth: Auth, firestore: Firestore, phone: string, password?: string) => {
    
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error('User with this phone number not found. Have you seeded the database?');
    }

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
        if (error.code === 'auth/too-many-requests') {
            throw new Error("Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.");
        }
        throw new Error('An error occurred during sign-in.');
    }
};

export const signOut = async (auth: Auth) => {
  return firebaseSignOut(auth);
};
