'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useEffect } from 'react';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

const publicPaths = ['/login', '/seed', '/'];

function RedirectLoader({ message }: { message: string }) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-xs text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isSessionLoading } = useSession();
  const { initializationError } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();

  const isFirebaseConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain &&
    firebaseConfig.storageBucket
  );

  if (!isFirebaseConfigured) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-destructive">Application Not Configured</CardTitle>
                    <CardDescription>Your application's client-side configuration is missing.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Alert variant="destructive">
                        <AlertTitle>Action Required: Add Environment Variables</AlertTitle>
                        <AlertDescription className="space-y-3">
                            <p>This application requires a client-side Firebase configuration to function, but the required environment variables are not set.</p>
                            <p>Please create a <strong>.env</strong> file in the root of your project and add your Firebase project's public configuration keys (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY=...`).</p>
                            <p className="text-sm italic">The server-side `npm run check` script works because it uses `serviceAccountKey.json`, but the browser application needs these separate public keys to connect.</p>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
  }

  const isLoading = isSessionLoading || (initializationError === null && !user && !publicPaths.includes(pathname));

  if (initializationError && !isSessionLoading) {
    const isFirestoreError = initializationError.message.includes("firestore");
    const isStorageError = initializationError.message.includes("Cloud Storage");
    const projectId = firebaseConfig.projectId;
    const firestoreConsoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`;
    const firestoreApiConsoleUrl = `https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${projectId}`;
    const storageConsoleUrl = `https://console.firebase.google.com/project/${projectId}/storage`;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-destructive">Firebase Initialization Failed</CardTitle>
                    <CardDescription>The application could not connect to all required Firebase services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert variant="destructive">
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-4">
                                <p>Please resolve the following issues in your Firebase project:</p>
                                {isFirestoreError && (
                                    <div className="space-y-2 p-3 bg-destructive/10 rounded-md">
                                        <p className="font-semibold">Firestore Not Available</p>
                                        <p className="text-xs">Your project is missing a Firestore database. Go to the Firebase console to create one, or enable the Firestore API if a database already exists.</p>
                                        <div className="flex gap-2 pt-1">
                                            <Button asChild className="flex-1" size="sm" variant="secondary">
                                                <a href={firestoreConsoleUrl} target="_blank" rel="noopener noreferrer">Create Database <ExternalLink className="ml-2 h-3 w-3"/></a>
                                            </Button>
                                            <Button asChild className="flex-1" size="sm" variant="secondary">
                                                <a href={firestoreApiConsoleUrl} target="_blank" rel="noopener noreferrer">Enable API <ExternalLink className="ml-2 h-3 w-3"/></a>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {isStorageError && (
                                    <div className="space-y-2 p-3 bg-destructive/10 rounded-md">
                                        <p className="font-semibold">Cloud Storage Not Available</p>
                                        <p className="text-xs">Go to the Storage console to enable Cloud Storage for your project.</p>
                                        <Button asChild className="w-full" size="sm" variant="secondary">
                                            <a href={storageConsoleUrl} target="_blank" rel="noopener noreferrer">Enable Storage <ExternalLink className="ml-2 h-4 w-4"/></a>
                                        </Button>
                                    </div>
                                )}
                                {!isFirestoreError && !isStorageError && (
                                    <p className="font-mono text-xs bg-destructive/20 p-2 rounded">
                                        {initializationError.message}
                                    </p>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                    <Button onClick={() => window.location.reload()} className="w-full">
                        Reload Page
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isSessionLoading, pathname, router]);
  
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const needsRedirect = !isSessionLoading && ((!user && !isPublicPath) || (user && pathname === '/login'));

  return (
    <>
        {needsRedirect && <RedirectLoader message="Redirecting..." />}
        {children}
    </>
  );
}
