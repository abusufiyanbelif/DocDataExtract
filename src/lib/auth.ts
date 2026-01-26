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
    getDocs,
    DocumentSnapshot
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export const signInWithLoginId = async (auth: Auth, firestore: Firestore, loginId: string, password?: string) => {
    
    const usersRef = collection(firestore, 'users');
    let userDoc: DocumentSnapshot | null = null;

    // First, query by loginId
    const loginIdQuery = query(usersRef, where("loginId", "==", loginId));
    const loginIdSnapshot = await getDocs(loginIdQuery);

    if (!loginIdSnapshot.empty) {
        userDoc = loginIdSnapshot.docs[0];
    } else {
        // If not found by loginId, try querying by phone number
        const phoneQuery = query(usersRef, where("phone", "==", loginId));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
            userDoc = phoneSnapshot.docs[0];
        }
    }

    if (!userDoc) {
        throw new Error('User not found. Please check your Login ID or Phone Number.');
    }

    const userData = userDoc.data() as UserProfile;
    
    if (userData.status === 'Inactive') {
        throw new Error('This account has been deactivated. Please contact an administrator.');
    }

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
        if (error.code === 'auth/configuration-not-found') {
             throw error; // Re-throw to be handled by the UI
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
