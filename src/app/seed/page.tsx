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

    if (!firestore) {
      const errorMsg = 'Firebase is not initialized. Please check your configuration.';
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`);
      setIsLoading(false);
      return;
    }
    
    // Use a temporary, secondary Firebase App instance for creating the user.
    // This avoids conflicts with the primary app's authentication state.
    const tempAppName = `seed-app-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      addLog('🚀 Starting initial admin setup...');
      
      const userLookupsRef = collection(firestore, 'user_lookups');
      
      const adminEmail = 'baitulmalss.solapur@gmail.com';
      const adminPhone = '9270946423';
      const adminUserKey = 'admin';
      const adminLoginId = 'admin';
      const adminPassword = "password";

      // Check for admin existence using the world-readable 'user_lookups' collection
      const adminLookupRef = doc(firestore, 'user_lookups', adminUserKey);
      const adminLookupSnap = await getDoc(adminLookupRef);
      
      if (adminLookupSnap.exists()) {
        addLog('✅ Admin user record already exists in the database. Skipping creation.');
        addLog('🔚 Setup process finished.');
        toast({ title: 'Setup Not Needed', description: 'The admin user already exists.' });
        setIsLoading(false);
        await deleteApp(tempApp);
        return;
      }
      
      addLog('👤 Admin user not found. Proceeding with creation...');
      const adminCreationBatch = writeBatch(firestore);

      try {
          const userCredential = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
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
          addLog('ℹ️ Database record prepared for new admin user.');

          // Create all necessary lookup records
          adminCreationBatch.set(doc(userLookupsRef, adminLoginId), { email: adminEmail });
          adminCreationBatch.set(doc(userLookupsRef, adminUserKey), { email: adminEmail });
          adminCreationBatch.set(doc(userLookupsRef, adminPhone), { email: adminEmail });
          addLog('ℹ️ User lookup records prepared.');

          await adminCreationBatch.commit();
          addLog('✅ Admin user and lookups successfully saved to the database.');
          addLog('---');
          addLog('🔑 Admin Credentials:');
          addLog(`   Login ID: ${adminLoginId}`);
          addLog(`   Password: ${adminPassword}`);
          addLog('---');
          addLog('🔒 IMPORTANT: Please log in and change this password immediately.');

          toast({
            title: 'Setup Complete',
            description: 'Initial admin user has been created successfully.',
            variant: 'success'
          });

      } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
              const authErrorMsg = `The admin email ${adminEmail} is already in use in Firebase Authentication, but the database records are missing. Please resolve this manually by deleting the user from the Firebase Authentication console and running this script again.`;
              addLog(`❌ ERROR: ${authErrorMsg}`);
              setError(authErrorMsg);
              throw new Error("Admin email already exists in Auth.");
          }
          // Re-throw other auth errors to be caught by the outer catch block
          throw error;
      }
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
            <CardTitle>Initial Application Setup</CardTitle>
            <CardDescription>
                This script performs the one-time setup required for the application. It creates the default administrator user, allowing you to log in and manage the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Important!</AlertTitle>
                <AlertDescription>
                    Run this script only once for the initial setup on a new project. If the admin user is created successfully, the temporary password will be displayed in the log below. You must log in and change it immediately.
                </AlertDescription>
            </Alert>

            <Button onClick={handleSeed} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Run Initial Setup
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
