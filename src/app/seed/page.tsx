'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { seedDatabase, createAdminUser } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, DatabaseZap, Loader2, ShieldAlert, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSeedDatabase = async () => {
    if (!firestore || !auth) {
      toast({ title: 'Error', description: 'Firebase is not available.', variant: 'destructive' });
      return;
    }
    setIsSeeding(true);
    setSetupError(null);
    try {
      await createAdminUser(auth);
      await seedDatabase(firestore);
      toast({
        title: 'Setup Complete!',
        description: "Admin user created and database seeded. You'll now be redirected to the login page.",
        duration: 5000,
      });
      router.push('/login');
    } catch (error: any) {
       if (error.message.includes('auth/configuration-not-found')) {
            setSetupError(error.message);
        } else {
            toast({
                title: 'Seeding Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
      setIsSeeding(false);
    }
  };

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/sign-in-method`;

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
            <CardDescription>
              This tool performs the required one-time setup for the application. It creates the initial administrator user and populates your Firestore database with sample data.
            </CardDescription>
            
            {setupError && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required: Enable Sign-In Method</AlertTitle>
                    <AlertDescription>
                        For the one-time initial setup, you must enable the 'Email/Password' provider in your Firebase project. This allows the app to create the first admin user.
                        <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                            <Link href={authUrl} target="_blank">
                                Go to Firebase Console
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
                {isSeeding ? 'Initializing...' : 'Seed Database Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
