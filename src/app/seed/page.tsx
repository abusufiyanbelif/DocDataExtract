'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useStorage, errorEmitter, FirestorePermissionError, type SecurityRuleContext }from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { writeBatch, doc, collection, serverTimestamp, getDocs, query, where, limit, getDoc } from 'firebase/firestore';
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
            await deleteObject(testFileRef);
            log("   -> Cleaned up test file.");
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
        const adminEmail = 'admin@docdataextract.app';
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
        const batch = writeBatch(firestore);
        
        log("Step 2: Verifying Admin User Data in Firestore");

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
        const adminData = { name: 'Admin User', phone: '0000000000', loginId: 'admin', userKey: 'admin', role: 'Admin', status: 'Active', permissions: allPermissions, };

        // --- Verify/Create User Profile ---
        const adminUserDocRef = doc(firestore, 'users', adminAuthUser.uid);
        const adminUserDocSnap = await getDoc(adminUserDocRef);
        
        if (!adminUserDocSnap.exists()) {
            log(" -> Admin user profile not found at the correct location. Checking for legacy profile...");
            const legacyUserQuery = query(collection(firestore, 'users'), where('userKey', '==', 'admin'), limit(1));
            const legacyUserSnap = await getDocs(legacyUserQuery);
            
            if (!legacyUserSnap.empty) {
                const legacyDoc = legacyUserSnap.docs[0];
                log(` -> Found legacy admin profile at doc ID '${legacyDoc.id}'. Migrating...`);
                batch.set(adminUserDocRef, legacyDoc.data()); // Copy data to new doc
                batch.delete(legacyDoc.ref); // Delete old doc
                log(" -> Legacy profile migration prepared for batch write.");
            } else {
                log(" -> No admin profile found. Creating a new one...");
                batch.set(adminUserDocRef, { ...adminData, createdAt: serverTimestamp() });
                log(" -> New admin user profile prepared for batch write.");
            }
        } else {
            log(" -> Admin user profile already exists at the correct location.");
        }

        // --- Verify/Create Lookups ---
        log(" -> Verifying user lookups...");
        const loginIdLookupRef = doc(firestore, 'user_lookups', adminData.loginId);
        const phoneLookupRef = doc(firestore, 'user_lookups', adminData.phone);
        
        const [loginIdLookupSnap, phoneLookupSnap] = await Promise.all([
            getDoc(loginIdLookupRef),
            getDoc(phoneLookupRef)
        ]);

        if (!loginIdLookupSnap.exists()) {
            batch.set(loginIdLookupRef, { userKey: adminData.userKey });
            log(` -> Created missing lookup for loginId: '${adminData.loginId}'.`);
        } else {
            log(` -> Lookup for loginId '${adminData.loginId}' already exists.`);
        }
        
        if (!phoneLookupSnap.exists()) {
            batch.set(phoneLookupRef, { userKey: adminData.userKey });
            log(` -> Created missing lookup for phone: '${adminData.phone}'.`);
        } else {
            log(` -> Lookup for phone '${adminData.phone}' already exists.`);
        }

        log(" -> Committing all changes to the database...");
        await batch.commit();
        log(" -> Database integrity check successful!");
    }
    
    const migrateExistingUsers = async () => {
        if (!firestore) throw new Error("Firestore service not available.");
        log("Step 3: Migrating existing user data for new login system.");
        log(" -> This will create lookup entries for each user. No user data will be deleted.");

        const usersRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersRef);

        if (usersSnapshot.empty) {
            log(" -> No existing users found to migrate. Skipping.");
            return;
        }

        const batch = writeBatch(firestore);
        let migratedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data() as UserProfile;
            const { userKey, loginId, phone } = userData;

            if (userKey === 'admin') continue; // Skip admin, it's handled separately

            if (!userKey || !loginId) {
                log(`   -> ⚠️ WARNING: Skipping user ${userDoc.id} (${userData.name || 'No Name'}) due to missing 'userKey' or 'loginId'.`);
                continue;
            }

            // Create/update loginId lookup
            const loginIdLookupRef = doc(firestore, 'user_lookups', loginId);
            batch.set(loginIdLookupRef, { userKey });

            // Create/update phone lookup
            if (phone) {
                const phoneLookupRef = doc(firestore, 'user_lookups', phone);
                batch.set(phoneLookupRef, { userKey });
            }
            migratedCount++;
        }

        if (migratedCount > 0) {
            await batch.commit();
            log(` -> Successfully processed and created lookups for ${migratedCount} user(s).`);
        } else {
             log(` -> No users required migration.`);
        }
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
            await migrateExistingUsers();

            log('✅ Script completed successfully. Admin user and all existing users are configured correctly.');
            toast({ title: 'Success', description: 'Admin user verified and all existing users have been migrated for the new login system.', variant: 'default' });
        } catch (e: any) {
            if (e.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'Setup script batch write',
                    operation: 'write',
                } as SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
            const errorMessage = e.message || 'An unknown error occurred.';
            log(`❌ FAILED: ${errorMessage}`);
            setErrorOccurred(true);
            if (!errorMessage.includes('permission')) {
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
                                    An error occurred during the process. Please review the logs below. If the error is related to permissions, the log may contain a link and instructions to fix your security rules.
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
