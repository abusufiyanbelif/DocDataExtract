'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithPhone } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, limit, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ScanSearch, AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const loginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!firestore) return;
    
    // Check seeding status to conditionally show the prompt
    const checkSeedingStatus = async () => {
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, limit(1));
            const snapshot = await getDocs(q);
            setIsSeeded(!snapshot.empty);
        } catch (error) {
            console.error("Error checking seeding status:", error);
            // Assume not seeded if there's an error, so the link is visible
            setIsSeeded(false);
        }
    };
    checkSeedingStatus();
  }, [firestore]);


  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setSetupError(null);

    if (!auth || !firestore) {
      toast({
        title: 'Error',
        description: 'Firebase service is not available. Please check your configuration.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    try {
      await signInWithPhone(auth, firestore, data.phone, data.password);
      toast({ title: 'Login Successful', description: "Welcome back!" });
      router.push('/');
    } catch (error: any) {
      if (error.message.includes('auth/configuration-not-found')) {
            setSetupError(error.message);
        } else {
             toast({
                title: 'Login Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/sign-in-method`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
       <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
                <ScanSearch className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline text-foreground">
                DocDataExtract AB
                </h1>
            </div>
          <CardTitle>Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="10-digit mobile number" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {setupError && (
        <Alert variant="destructive" className="mt-4 max-w-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required: Enable Sign-In Method</AlertTitle>
            <AlertDescription className="space-y-3">
                <p>For the one-time initial setup, you must enable the 'Email/Password' provider in your Firebase project. This allows the app to create the first admin user.</p>
                <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                    <Link href={authUrl} target="_blank">
                        Go to Firebase Console to Enable
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                 <p className="text-xs text-center mt-2 text-muted-foreground">After enabling, please go to the seed page to initialize the database.</p>
            </AlertDescription>
        </Alert>
      )}

      {isSeeded === false && !setupError && (
        <Alert className="mt-4 max-w-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>First-time user?</AlertTitle>
            <AlertDescription>
            If this is your first time setting up the app, you must{' '}
            <Link href="/seed" className="font-bold text-primary underline">
                seed the database
            </Link>
            {' '}before you can log in.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
