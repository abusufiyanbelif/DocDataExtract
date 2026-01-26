'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { seedDatabase } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, DatabaseZap, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    if (!firestore) {
      toast({ title: 'Error', description: 'Firestore is not available.', variant: 'destructive' });
      return;
    }
    setIsSeeding(true);
    try {
      await seedDatabase(firestore);
      router.push('/');
    } catch (error) {
      console.error('Seeding failed:', error);
      setIsSeeding(false);
    }
  };

  const renderContent = () => {
    if (isProfileLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (userProfile?.role !== 'Admin') {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. This tool is for administrators only.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <>
        <CardDescription>
          This tool will populate your Firestore database with the initial set of collections and sample data required for the application to function correctly. This is a one-time action.
        </CardDescription>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Warning: This is a Destructive Action</AlertTitle>
          <AlertDescription>
            Running this process will add sample data. While it won't delete existing data, it could create duplicates if run more than once. Proceed with caution.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            variant="destructive"
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
      </>
    );
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
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Database Seeding Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderContent()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
