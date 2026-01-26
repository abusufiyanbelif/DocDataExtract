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

export const signInWithUserKey = async (auth: Auth, firestore: Firestore, userKey: string, password?: string) => {
    
    // Find the user profile document in Firestore based on the userKey
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where("userKey", "==", userKey));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error('User not found.');
    }

    // In a real app, you would verify the password against a hash on the server.
    // For this demo, we assume the password provided is correct and proceed to sign in with Firebase Auth.
    // This is NOT secure and for demonstration purposes only.
    if (!password) {
        throw new Error('Password is required.');
    }

    // We'll create a "fake" email to use with Firebase Auth, as it's required.
    const email = `${userKey}@docdataextract.app`;

    try {
        // IMPORTANT: For this demo to work, you must manually create users in your
        // Firebase Authentication console with the email format `userKey@docdataextract.app`
        // and the correct password.
        return await signInWithEmailAndPassword(auth, email, password);
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
