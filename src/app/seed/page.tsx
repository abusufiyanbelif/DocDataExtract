'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { seedDatabase, createAdminUser } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, DatabaseZap, Loader2, ShieldAlert, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export default function SeedPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingLog, setSeedingLog] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const checkSeedingStatus = async () => {
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, limit(1));
            const snapshot = await getDocs(q);
            setIsSeeded(!snapshot.empty);
        } catch (error) {
            console.error("Error checking seeding status:", error);
            setIsSeeded(false); // On error, assume not seeded to allow user to try
        }
    };
    checkSeedingStatus();
  }, [firestore]);


  const handleSeedDatabase = async () => {
    if (!firestore || !auth) {
      toast({ title: 'Error', description: 'Firebase is not available.', variant: 'destructive' });
      return;
    }
    setIsSeeding(true);
    setSeedingLog([]);
    setSetupError(null);
    
    const log = (message: string) => {
        setSeedingLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    try {
      await createAdminUser(auth, log);
      await seedDatabase(firestore, log);
      log("Setup Complete! You'll now be redirected to the login page.");
      toast({
        title: 'Setup Complete!',
        description: "You'll be redirected to the login page shortly.",
        duration: 5000,
      });
      setTimeout(() => router.push('/login'), 2000);

    } catch (error: any) {
       if (error.message.includes('auth/configuration-not-found')) {
            setSetupError(error.message);
        } else {
            toast({
                title: 'Seeding Failed',
                description: 'An error occurred during seeding. Check the progress log for details.',
                variant: 'destructive',
            });
        }
      setIsSeeding(false);
    }
  };

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/sign-in-method`;

  if (isSeeded === null) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

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
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Database Seeding Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSeeded ? (
                <Alert variant="default" className="border-green-500 text-green-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
                    <AlertDescription>
                        The database has already been initialized with sample data and an admin user. You can now proceed to the login page.
                    </AlertDescription>
                    <div className="mt-4">
                         <Button asChild className="w-full">
                            <Link href="/login">
                                Go to Login Page
                            </Link>
                        </Button>
                    </div>
                </Alert>
            ) : (
                <>
                    <CardDescription>
                      This tool performs the required one-time setup for the application. It solves the initial "chicken-and-egg" problem: you can't log in without a user in the database, and you can't create a user without being logged in. This tool creates the first admin user and populates the database with sample data.
                    </CardDescription>
                    
                    {setupError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>One-Time Setup Step: Enable Sign-In Method</AlertTitle>
                            <AlertDescription className="space-y-3">
                                <div>
                                    <p className="font-bold">Why is this required?</p>
                                    <p>Your app's normal login uses your database, just as you expect. However, to create the very first admin user and collections securely, the app must prove its identity to Firebase. Enabling the 'Email/Password' provider is the <span className="font-bold">one-time key</span> that authorizes this initial setup. It is not used for regular user logins.</p>
                                </div>
                                <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                                    <Link href={authUrl} target="_blank">
                                        Go to Firebase Console to Enable
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <p className="text-xs text-center mt-2 text-muted-foreground">After enabling, please try seeding the database again.</p>
                            </AlertDescription>
                        </Alert>
                    )}

                    <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Important Setup Step</AlertTitle>
                    <AlertDescription>
                        Running this process will create the initial 'admin' user and add sample data. While it won't delete existing data, it may create duplicates if run more than once.
                    </AlertDescription>
                    </Alert>
                    <div className="flex justify-center pt-4">
                    <Button
                        size="lg"
                        onClick={handleSeedDatabase}
                        disabled={isSeeding}
                    >
                        {isSeeding ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                        <DatabaseZap className="mr-2 h-5 w-5" />
                        )}
                        {isSeeding ? 'Seeding...' : 'Seed Database Now'}
                    </Button>
                    </div>

                    {isSeeding && (
                        <Card className="mt-4 bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Seeding Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-sm font-mono bg-background p-4 rounded-md h-48 overflow-y-auto">
                                    <code>
                                        {seedingLog.join('\n')}
                                    </code>
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
