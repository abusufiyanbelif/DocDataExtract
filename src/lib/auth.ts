'use client';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  Auth,
} from 'firebase/auth';
import { 
    Firestore, 
    collection, 
    doc,
    getDoc
} from 'firebase/firestore';

export const signInWithLoginId = async (auth: Auth, firestore: Firestore, loginId: string, password?: string) => {
    
    const lookupsRef = collection(firestore, 'user_lookups');
    let userKey: string | null = null;

    // Attempt to find userKey from loginId or phone in the public lookup collection
    const lookupDocRef = doc(lookupsRef, loginId);
    const lookupDoc = await getDoc(lookupDocRef);

    if (lookupDoc.exists()) {
        userKey = lookupDoc.data().userKey;
    }

    if (!userKey) {
        throw new Error('User not found. Please check your Login ID or Phone Number.');
    }
    
    if (!password) {
        throw new Error('Password is required.');
    }

    // The user's email is their unique userKey + the app domain.
    const email = `${userKey}@docdataextract.app`;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Post-login check to ensure the user is active.
        const userDocRef = doc(firestore, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().status === 'Inactive') {
            await firebaseSignOut(auth); // Sign the user out immediately
            throw new Error('This account has been deactivated. Please contact an administrator.');
        }
        
        return userCredential;
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
        // Re-throw our custom deactivation error
        if (error.message.includes('deactivated')) {
            throw error;
        }
        throw new Error('An error occurred during sign-in.');
    }
};

export const signOut = async (auth: Auth) => {
  return firebaseSignOut(auth);
};
