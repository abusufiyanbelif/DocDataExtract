'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Database, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { createAdminPermissions } from '@/lib/modules';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';


export default function SeedPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleSeed = async () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);

    addLog('🚀 Starting Initial Setup & Deep Scan...');
    addLog('This script will diagnose and repair the default administrator account.');
    addLog('---');
    addLog('ℹ️ Required Collections: users, user_lookups, campaigns, donations');
    addLog('  - "users" & "user_lookups" will be validated or created by this script.');
    addLog('  - "campaigns" & "donations" are created by the app when you add data.');
    addLog('---');


    if (!firestore) {
      const errorMsg = 'Firebase is not initialized. Please check your configuration.';
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`);
      setIsLoading(false);
      return;
    }
    
    const tempAppName = `seed-app-${Date.now()}`;
    let tempApp;
    
    try {
        tempApp = initializeApp(firebaseConfig, tempAppName);
    } catch(e) {
        const errorMsg = 'Firebase configuration is invalid. Please check your .env file.';
        setError(errorMsg);
        addLog(`❌ ${errorMsg}`);
        setIsLoading(false);
        return;
    }
    
    const tempAuth = getAuth(tempApp);
    
    const adminEmail = 'baitulmalss.solapur@gmail.com';
    const adminPhone = '9270946423';
    const adminUserKey = 'admin';
    const adminLoginId = 'admin';
    const adminPassword = "password";

    try {
      addLog('Step 1: Checking for existing admin in Firebase Auth...');
      
      try {
        // Attempt to sign in to see if the user exists
        const userCredential = await signInWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
        const user = userCredential.user;
        addLog(`✅ Auth user found (UID: ${user.uid}). Verifying database records...`);
        
        // If auth user exists, verify/repair all DB records
        const repairBatch = writeBatch(firestore);
        
        // 1. Verify 'users' document
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          addLog(`   - "users" document missing. Re-creating...`);
          const userProfileData = {
              name: 'System Admin',
              email: adminEmail,
              phone: adminPhone,
              loginId: adminLoginId,
              userKey: adminUserKey,
              role: 'Admin',
              status: 'Active',
              permissions: createAdminPermissions(),
              createdAt: serverTimestamp(),
              createdById: 'system',
              createdByName: 'System Seed'
          };
          repairBatch.set(userDocRef, userProfileData);
        } else {
           addLog(`   - "users" document OK.`);
        }

        // 2. Verify 'user_lookups'
        const lookupsToVerify: Record<string, {email: string}> = {
          [adminLoginId]: { email: adminEmail },
          [adminUserKey]: { email: adminEmail },
          [adminPhone]: { email: adminEmail },
        };

        for (const [lookupId, lookupData] of Object.entries(lookupsToVerify)) {
            const lookupDocRef = doc(firestore, 'user_lookups', lookupId);
            const lookupDocSnap = await getDoc(lookupDocRef);
            if (!lookupDocSnap.exists()) {
                addLog(`   - Lookup for "${lookupId}" missing. Re-creating...`);
                repairBatch.set(lookupDocRef, lookupData);
            } else {
                 addLog(`   - Lookup for "${lookupId}" OK.`);
            }
        }
        
        await repairBatch.commit();
        addLog('✅ Database records verified and synchronized.');

      } catch (authError: any) {
        // This block runs if signInWithEmailAndPassword fails
        if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
          addLog(`👤 Auth user not found. Proceeding to create new account...`);

          const newUserCredential = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
          const newUid = newUserCredential.user.uid;
          addLog(`   - Auth account created with UID: ${newUid}.`);
          
          addLog('   - Preparing database records...');
          const creationBatch = writeBatch(firestore);
          const userDocRef = doc(firestore, 'users', newUid);
          const userProfileData = {
              name: 'System Admin',
              email: adminEmail,
              phone: adminPhone,
              loginId: adminLoginId,
              userKey: adminUserKey,
              role: 'Admin',
              status: 'Active',
              permissions: createAdminPermissions(),
              createdAt: serverTimestamp(),
              createdById: 'system',
              createdByName: 'System Seed'
          };
          creationBatch.set(userDocRef, userProfileData);

          const userLookupsRef = collection(firestore, 'user_lookups');
          creationBatch.set(doc(userLookupsRef, adminLoginId), { email: adminEmail });
          creationBatch.set(doc(userLookupsRef, adminUserKey), { email: adminEmail });
          creationBatch.set(doc(userLookupsRef, adminPhone), { email: adminEmail });

          addLog('   - Committing records to database...');
          await creationBatch.commit();
          addLog('✅ New admin user and all database records created successfully.');

        } else if (authError.code === 'auth/email-already-in-use') {
            const errorMsg = `Admin email '${adminEmail}' exists in Auth, but login failed (likely wrong password). Please reset the password in the Firebase Console and run this script again.`;
            setError(errorMsg);
            addLog(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        } else {
          // Re-throw other unexpected auth errors
          throw authError;
        }
      }

      addLog('---');
      addLog('🔑 Admin Credentials:');
      addLog(`   Login ID: ${adminLoginId}`);
      addLog(`   Password: ${adminPassword}`);
      addLog('---');
      addLog('🔒 IMPORTANT: If a new user was created, please log in and change this password immediately.');
      
      toast({
        title: 'Setup Complete',
        description: 'Initial admin user has been successfully configured.',
        variant: 'success'
      });

    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(errorMessage);
      addLog(`❌ An error occurred during setup: ${errorMessage}`);
      toast({
        title: 'Setup Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      // Clean up the temporary Firebase app instance
      if (tempApp) {
        await deleteApp(tempApp);
      }
      addLog('🔚 Setup process finished.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
            <Button variant="outline" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </div>
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Initial Application Setup & Diagnostics</CardTitle>
            <CardDescription>
                This script performs a deep scan to diagnose and repair the default administrator account, ensuring all necessary database records and authentication entries are consistent and correct.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Important!</AlertTitle>
                <AlertDescription>
                    Run this script to set up your application for the first time or to repair the admin account if you are having login issues.
                </AlertDescription>
            </Alert>

            <Button onClick={handleSeed} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Run Setup & Diagnostics
            </Button>
            
            <div className="space-y-2">
                <h3 className="font-medium">Logs</h3>
                <ScrollArea className="h-72 w-full rounded-md border p-4 font-mono text-sm">
                    {logs.map((log, i) => (
                        <p key={i}>{log}</p>
                    ))}
                    {logs.length === 0 && <p className="text-muted-foreground">Logs will appear here...</p>}
                </ScrollArea>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>An Error Occurred</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
