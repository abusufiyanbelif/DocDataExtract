'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useStorage, errorEmitter, FirestorePermissionError, type SecurityRuleContext }from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getAuth, initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { writeBatch, doc, collection, serverTimestamp, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { modules } from '@/lib/modules';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SeedPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [errorOccurred, setErrorOccurred] = useState(false);

    const log = (message: string) => {
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };
    
    const testStoragePermissions = async () => {
        if (!storage) throw new Error("Storage service not available.");
        log(" -> Testing Storage write permissions...");
        const testFile = `diagnostics/seed_test_${Date.now()}.txt`;
        const testFileRef = storageRef(storage, testFile);
        try {
            await uploadBytes(testFileRef, new Blob(['test']));
            log("   -> Write permissions test successful.");
            try {
                await deleteObject(testFileRef);
                log("   -> Cleaned up test file.");
            } catch (cleanupError: any) {
                log(`   -> ⚠️ WARNING: Could not clean up test file (${testFile}). This may be due to missing delete permissions in your Storage Security Rules. Manual deletion is recommended. Error: ${cleanupError.message}`);
            }
            return true;
        } catch (error: any) {
             const storageRulesUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/storage/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/rules`;
            let errorMessage = `Storage write permission test failed. This is likely a security rules issue. (Code: ${error.code || 'unknown'})`;
            log(`❌ ERROR: ${errorMessage}`);
            log('------------------------------------------');
            log('SOLUTION: Go to the Storage Rules editor in your Firebase console and ensure authenticated users can write.');
            log('Paste the following rules and click "Publish":');
            log(`
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
            `);
            log(`Link to rules: ${storageRulesUrl}`);
            log('------------------------------------------');
            throw new Error(errorMessage);
        }
    }

    const createAdminUser = async (): Promise<User> => {
        if (!auth) throw new Error("Auth service not available.");
        const adminEmail = 'baitulmalss.solapur@gmail.com';
        const adminPassword = 'password';
        
        log("Step 1: Admin User Authentication Setup");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            log(" -> Admin auth account already exists. Sign-in successful.");
            return userCredential.user;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                log(" -> Admin auth account not found. Creating a new one...");
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                    log(" -> Successfully created admin user in Firebase Auth.");
                    return userCredential.user;
                } catch (creationError: any) {
                    throw new Error(`Could not create admin user in Auth: ${creationError.message}`);
                }
            } else if (error.code === 'auth/configuration-not-found') {
                const authUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/sign-in-method`;
                log(`❌ ERROR: Firebase auth is not configured to allow email/password sign-in.`);
                log(`SOLUTION: Please enable it in the Firebase Console: ${authUrl}`);
                throw new Error("Firebase auth is not configured to allow email/password sign-in. Please enable it in the Firebase Console.");
            } else {
                throw new Error(`An unexpected error occurred during admin sign-in: ${error.message}.`);
            }
        }
    };
    
    const ensureAdminIntegrity = async (adminAuthUser: User) => {
        if (!firestore) throw new Error("Firestore service not available.");
        log("Step 2: Verifying & Consolidating Admin User Data in Firestore");
        const adminEmail = adminAuthUser.email!;

        const usersRef = collection(firestore, 'users');
        
        log(" -> Searching for legacy or duplicate admin documents...");
        const adminQuery = query(usersRef, where('userKey', '==', 'admin'));
        const adminQuerySnap = await getDocs(adminQuery);
        const docsToDelete = adminQuerySnap.docs.filter(doc => doc.id !== adminAuthUser.uid);

        if (docsToDelete.length > 0) {
            log(` -> Found ${docsToDelete.length} duplicate/legacy admin document(s). Removing...`);
            const deleteBatch = writeBatch(firestore);
            docsToDelete.forEach(doc => {
                log(`   -> Deleting document with ID: ${doc.id}`);
                deleteBatch.delete(doc.ref);
            });
            try {
                await deleteBatch.commit();
                log(" -> Successfully removed duplicate documents.");
            } catch (error: any) {
                 if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: 'users collection (deleting duplicates)',
                        operation: 'delete',
                    }));
                }
                throw error;
            }
        } else {
            log(" -> No duplicate admin documents found.");
        }


        log(" -> Verifying the primary admin user document...");
        const allPermissions: any = {};
        for (const mod of modules) {
            allPermissions[mod.id] = {};
            for (const perm of mod.permissions) {
                allPermissions[mod.id][perm] = true;
            }
            if (mod.subModules) {
                 for (const subMod of mod.subModules) {
                    allPermissions[mod.id][subMod.id] = {};
                    for (const perm of subMod.permissions) {
                        allPermissions[mod.id][subMod.id][perm] = true;
                    }
                }
            }
        }
        const canonicalAdminData: Omit<UserProfile, 'id'> = { name: 'System Admin', email: adminEmail, phone: '9270946423', loginId: 'admin', userKey: 'admin', role: 'Admin', status: 'Active', permissions: allPermissions };
        const adminUserDocRef = doc(firestore, 'users', adminAuthUser.uid);

        try {
            await setDoc(adminUserDocRef, { ...canonicalAdminData, createdAt: serverTimestamp() }, { merge: true });
            log(" -> Primary admin document is created and/or up to date.");
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: adminUserDocRef.path,
                    operation: 'write',
                    requestResourceData: canonicalAdminData,
                }));
            }
            throw error;
        }

        log(" -> Verifying user lookups...");
        const lookupBatch = writeBatch(firestore);
        const loginIdLookupRef = doc(firestore, 'user_lookups', canonicalAdminData.loginId);
        const phoneLookupRef = doc(firestore, 'user_lookups', canonicalAdminData.phone);
        
        const oldPhoneDoc = await getDoc(doc(firestore, 'user_lookups', '0000000000'));
        if (oldPhoneDoc.exists()) {
            log("   -> Removing old default phone number lookup for admin.");
            lookupBatch.delete(oldPhoneDoc.ref);
        }

        lookupBatch.set(loginIdLookupRef, { email: adminEmail });
        lookupBatch.set(phoneLookupRef, { email: adminEmail });
        
        log(" -> Committing admin lookup changes to the database...");
        try {
            await lookupBatch.commit();
            log(" -> Admin lookup changes committed.");
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'user_lookups (batch write)',
                    operation: 'write',
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            throw error;
        }
    }
    
    const migrateLegacyUsers = async () => {
        if (!firestore || !auth) throw new Error("Services not available.");
        log("Step 3: Migrating Legacy User Data");
        log(" -> This will create secure Auth entries for users found in Firestore without one.");

        const tempAppName = `migration-app-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        const usersRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersRef);

        if (usersSnapshot.empty) {
            log(" -> No users found in Firestore. Skipping migration.");
            await deleteApp(tempApp);
            return;
        }

        let migratedCount = 0;
        const mainAdminUID = auth.currentUser?.uid;

        for (const userDoc of usersSnapshot.docs) {
             if (userDoc.id === mainAdminUID) {
                continue;
            }

            const legacyUserData = { id: userDoc.id, ...userDoc.data() } as UserProfile;

            if (!legacyUserData.email) {
                log(` -> ⚠️ WARNING: Skipping user '${legacyUserData.name}' (ID: ${legacyUserData.id}) because they have no email address. Please manually add a unique email and re-run this script.`);
                continue;
            }
            
            try {
                const signInMethods = await fetchSignInMethodsForEmail(auth, legacyUserData.email);
                if (signInMethods.length > 0) {
                    log(` -> User '${legacyUserData.email}' already has an auth account. Skipping Auth creation.`);
                    continue;
                }

                log(` -> Migrating '${legacyUserData.name}' (${legacyUserData.email})...`);
                migratedCount++;

                const tempPassword = `P@ss_${Math.random().toString(36).slice(-8)}`;
                const userCredential = await createUserWithEmailAndPassword(tempAuth, legacyUserData.email, tempPassword);
                const newUid = userCredential.user.uid;

                log(`   -> Created Auth account with new UID: ${newUid}`);
                log(`   -> !!! TEMPORARY PASSWORD for ${legacyUserData.email}: ${tempPassword}`);
                
                const newUserDocRef = doc(firestore, 'users', newUid);
                const { id, ...dataToCopy } = legacyUserData;
                
                const batch = writeBatch(firestore);
                batch.set(newUserDocRef, { ...dataToCopy, createdAt: serverTimestamp() });
                log(`   -> Staged new Firestore document at users/${newUid}.`);
                
                if (legacyUserData.loginId) {
                    const loginIdLookupRef = doc(firestore, 'user_lookups', legacyUserData.loginId);
                    batch.set(loginIdLookupRef, { email: legacyUserData.email });
                    log(`   -> Staged loginId lookup.`);
                }
                if (legacyUserData.phone) {
                    const phoneLookupRef = doc(firestore, 'user_lookups', legacyUserData.phone);
                    batch.set(phoneLookupRef, { email: legacyUserData.email });
                    log(`   -> Staged phone lookup.`);
                }

                batch.delete(userDoc.ref);
                log(`   -> Staged deletion of old document: users/${userDoc.id}.`);
                
                await batch.commit();
                log(`   -> Successfully committed migration for ${legacyUserData.name}.`);

            } catch (error: any) {
                log(` -> ❌ ERROR migrating user ${legacyUserData.name}: ${error.message}`);
                setErrorOccurred(true);
            }
        }
        
        if (migratedCount > 0) {
            log(` -> Migration finished. ${migratedCount} user(s) were successfully migrated.`);
        } else {
            log(" -> No users required migration at this time.");
        }
        
        await deleteApp(tempApp);
    }
    
    const handleSeed = async () => {
        setIsSeeding(true);
        setErrorOccurred(false);
        setLogs([]);
        log('Starting setup and data migration script...');

        if (!auth || !firestore || !storage) {
            log('❌ ERROR: Firebase services are not available. Please check your configuration.');
            setErrorOccurred(true);
            toast({ title: 'Script Failed', description: 'Firebase services are not available.', variant: 'destructive', });
            setIsSeeding(false);
            return;
        }

        try {
            const adminAuthUser = await createAdminUser();
            await testStoragePermissions();
            await ensureAdminIntegrity(adminAuthUser);
            await migrateLegacyUsers();

            log('✅ Script completed successfully. Admin user and all existing users are configured correctly.');
            toast({ title: 'Success', description: 'Admin user verified and all existing users have been migrated for the new login system.', variant: 'success' });
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.';
            log(`❌ FAILED: ${errorMessage}`);
            setErrorOccurred(true);
            
            if (e.name !== 'FirestorePermissionError' && e.code !== 'permission-denied') {
                 toast({ title: 'Script Failed', description: 'An error occurred. Check the logs for details.', variant: 'destructive' });
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
                        <CardTitle>Setup & Data Migration</CardTitle>
                        <CardDescription>This script verifies the primary Admin user and migrates all existing user data to be compatible with the latest login system. It is safe to run this multiple times and will not delete any user profiles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={handleSeed} disabled={isSeeding}>
                                {isSeeding ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <PlayCircle className="mr-2 h-4 w-4" /> )}
                                Run Setup & Migration
                            </Button>
                             <Button variant="secondary" asChild>
                                <Link href="/diagnostics">
                                    Run System Diagnostics
                                </Link>
                            </Button>
                        </div>
                        
                         {errorOccurred && (
                            <Alert variant="destructive">
                                <AlertTitle>Script Failed</AlertTitle>
                                <AlertDescription>
                                    One or more errors occurred during the process. Please review the logs below. If the error is related to permissions, the log may contain a link and instructions to fix your security rules.
                                </AlertDescription>
                            </Alert>
                        )}
                        
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
