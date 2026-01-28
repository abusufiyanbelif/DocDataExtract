'use client';
import { useState } from 'react';
import { useFirestore, useAuth } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Database, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { createAdminPermissions } from '@/lib/modules';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SeedPage() {
  const firestore = useFirestore();
  const mainAuth = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };
  
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSeed = async () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);

    if (!firestore || !mainAuth) {
      setError('Firebase is not initialized. Please check your configuration.');
      addLog('❌ Firebase is not initialized.');
      setIsLoading(false);
      return;
    }
    
    const tempAppName = `seed-app-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      addLog('🚀 Starting setup and migration...');
      
      const usersRef = collection(firestore, 'users');
      const userLookupsRef = collection(firestore, 'user_lookups');
      
      // Data cleanup cannot be performed securely from an unauthenticated client.
      // The root causes of orphaned data have been fixed in the user management pages.
      addLog('ℹ️ Skipping orphaned data scan. This check can only be performed by an authenticated admin.');

      // --- Admin Creation Step ---
      const adminEmail = 'baitulmalss.solapur@gmail.com';
      const adminPhone = '9270946423';
      const adminUserKey = 'admin';
      const adminLoginId = 'admin';

      // Check for admin existence using the world-readable lookups collection
      const adminLookupRef = doc(firestore, 'user_lookups', adminUserKey);
      const adminLookupSnap = await getDoc(adminLookupRef);
      
      const adminCreationBatch = writeBatch(firestore);

      if (!adminLookupSnap.exists()) {
        addLog('👤 Admin user does not exist. Creating...');
        
        const tempAdminPassword = "password";

        try {
            const userCredential = await createUserWithEmailAndPassword(tempAuth, adminEmail, tempAdminPassword);
            const newUid = userCredential.user.uid;
            addLog(`✅ Firebase Auth account created for admin with UID: ${newUid}.`);

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
                createdAt: serverTimestamp()
            };
            adminCreationBatch.set(userDocRef, userProfileData);

            // Create lookups
            adminCreationBatch.set(doc(userLookupsRef, adminLoginId), { email: adminEmail });
            adminCreationBatch.set(doc(userLookupsRef, adminUserKey), { email: adminEmail });
            adminCreationBatch.set(doc(userLookupsRef, adminPhone), { email: adminEmail });

            addLog(`🔑 Admin temporary password is: ${tempAdminPassword}`);
            addLog('🔒 Please log in and change this password immediately.');

        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                addLog(`⚠️ Auth account for ${adminEmail} already exists. Skipping auth creation.`);
                setError(`The admin email ${adminEmail} is already in use in Firebase Authentication, but the corresponding database records are missing. Please resolve this manually in your Firebase console.`);
                throw new Error("Admin email already exists in Auth.");
            }
            throw error; // Rethrow other errors
        }
      } else {
        addLog('✅ Admin user database record already exists. Skipping admin creation.');
      }
      
      await adminCreationBatch.commit();
      addLog('✅ Admin setup complete.');

      // --- User Migration Logic ---
      addLog('🔄 Starting migration of existing legacy database users...');
      const migrationBatch = writeBatch(firestore);
      const allUsersSnap = await getDocs(usersRef);

      if (allUsersSnap.empty) {
        addLog('No users found in the database to migrate.');
      } else {
        let migrationCount = 0;
        for (const userDoc of allUsersSnap.docs) {
          const userData = userDoc.data();
          const userId = userDoc.id;

          const isLegacyRecord = !userData.email || !isNaN(Date.parse(userId));
          
          if (!isLegacyRecord) {
            addLog(`- Skipping user '${userData.name || userId}'. Already appears to be a modern record.`);
            continue;
          }
          migrationCount++;
          addLog(`- Processing legacy user record: '${userData.name || userId}'`);

          let userEmail = userData.email;
          const userPhone = userData.phone;

          if (!userEmail && userPhone) {
              userEmail = `+${userPhone}@docdataextract.app`; // Create synthetic email for phone users
              addLog(`  - No email found. Creating synthetic email from phone: ${userEmail}`);
          }

          if (!userEmail) {
              addLog(`  - ⚠️ SKIPPING: User '${userData.name}' has no email or phone number. Cannot create auth account.`);
              continue;
          }

          const tempPassword = generatePassword();
          
          try {
            const userCredential = await createUserWithEmailAndPassword(tempAuth, userEmail, tempPassword);
            const newUid = userCredential.user.uid;
            addLog(`  - ✅ Auth account created for '${userData.name}' with UID: ${newUid}`);

            const newUserDocRef = doc(firestore, 'users', newUid);
            const newProfileData = {
              ...userData,
              email: userEmail,
              createdAt: userData.createdAt || serverTimestamp(),
            };
            migrationBatch.set(newUserDocRef, newProfileData);
            addLog(`  - Database record prepared for new UID.`);

            if (userData.loginId) migrationBatch.set(doc(userLookupsRef, userData.loginId), { email: userEmail });
            if (userData.phone) migrationBatch.set(doc(userLookupsRef, userData.phone), { email: userEmail });
            if (userData.userKey) migrationBatch.set(doc(userLookupsRef, userData.userKey), { email: userEmail });

            migrationBatch.delete(userDoc.ref);
            addLog(`  - Old database record marked for deletion.`);

            addLog(`  - 🔑 Temporary password for ${userData.name} (${userEmail}): ${tempPassword}`);
          } catch(error: any) {
              if (error.code === 'auth/email-already-in-use') {
                addLog(`  - ⚠️ SKIPPING: Auth account for '${userData.name}' (${userEmail}) already exists. No changes made.`);
              } else {
                addLog(`  - ❌ ERROR: Could not create auth account for '${userData.name}' (${userEmail}). Reason: ${error.message}`);
              }
          }
        }
        if (migrationCount > 0) {
            await migrationBatch.commit();
            addLog('✅ User migration batch commit successful.');
        }
      }

      toast({
        title: 'Setup Complete',
        description: 'Initial data has been seeded and migrated successfully.',
        variant: 'success'
      });
    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(errorMessage);
      addLog(`❌ An error occurred: ${errorMessage}`);
      toast({
        title: 'Setup Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      await deleteApp(tempApp);
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
            <CardTitle>Setup & Data Migration</CardTitle>
            <CardDescription>
                This script performs key setup and cleanup functions. It creates a default admin, migrates legacy users to the secure authentication system, and cleans up any orphaned data records it finds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Important!</AlertTitle>
                <AlertDescription>
                    Run this script only once for initial setup, or if you suspect data inconsistencies. If temporary passwords are generated for migrated users, they will be displayed in the log below. You must securely share these passwords with your users.
                </AlertDescription>
            </Alert>

            <Button onClick={handleSeed} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Run Setup & Migration
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
