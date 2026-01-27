'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithLoginId } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ScanSearch, AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const loginSchema = z.object({
  loginId: z.string().min(3, 'Login ID or Phone Number is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isFirebaseConfigured = !!firebaseConfig.projectId;
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setSetupError(null);
    setLoginError(null);

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
      await signInWithLoginId(auth, firestore, data.loginId, data.password);
      toast({ title: 'Login Successful', description: "Welcome back!", variant: 'success' });
      router.push('/');
    } catch (error: any) {
      if (error.message.includes('auth/configuration-not-found')) {
            setSetupError(error.message);
        } else {
             setLoginError(error.message || 'An unexpected error occurred.');
        }
    } finally {
      setIsLoading(false);
    }
  };

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/sign-in-method`;

  if (!isFirebaseConfigured) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-3 mb-4">
                         <ScanSearch className="h-8 w-8 text-primary" />
                         <h1 className="text-3xl font-bold font-headline text-foreground">DocDataExtract AB</h1>
                    </div>
                    <CardTitle className="text-destructive">Application Not Configured</CardTitle>
                </CardHeader>
                <CardContent>
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Missing Firebase Configuration</AlertTitle>
                        <AlertDescription>
                            <p>This application requires Firebase to function, but it has not been configured yet.</p>
                            <p className="mt-2">Please create a <strong>.env</strong> file in the root of your project and add your Firebase project's configuration keys.</p>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
  }

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
                name="loginId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Login ID or Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. your_login_id or 0000000000" 
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
      
      {loginError && (
        <Alert variant="destructive" className="mt-4 max-w-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>
                {loginError}
            </AlertDescription>
        </Alert>
      )}

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
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
