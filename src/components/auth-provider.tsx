
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useEffect } from 'react';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const { user, isLoading } = useSession();
  const { initializationError } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();

  if (initializationError) {
    const isFirestoreError = initializationError.message.includes("Firestore is not available");
    const projectId = firebaseConfig.projectId;
    const firestoreConsoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`;
    const firestoreApiConsoleUrl = `https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${projectId}`;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-destructive">Firebase Initialization Failed</CardTitle>
                    <CardDescription>The application could not connect to Firestore.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert variant="destructive">
                        <AlertTitle>
                            {isFirestoreError ? "Action Required: Check Firestore Status" : "Configuration Error"}
                        </AlertTitle>
                        <AlertDescription>
                            {isFirestoreError && projectId ? (
                                <div className="space-y-4">
                                  <p>The application has successfully connected to your Firebase project (<strong>{projectId}</strong>), but it cannot access the Firestore service. This usually happens for one of two reasons:</p>
                                  
                                  <div className="space-y-2">
                                      <p><strong>1. Firestore Database Not Created:</strong> If you haven't created a database yet, you'll need to do so.</p>
                                      <Button asChild className="w-full" variant="secondary">
                                          <a href={firestoreConsoleUrl} target="_blank" rel="noopener noreferrer">Go to Firebase Console to Create Database <ExternalLink className="ml-2 h-4 w-4"/></a>
                                      </Button>
                                  </div>

                                  <div className="space-y-2">
                                      <p><strong>2. Cloud Firestore API is Disabled:</strong> Your database exists, but the API to access it is turned off.</p>
                                      <Button asChild className="w-full" variant="secondary">
                                          <a href={firestoreApiConsoleUrl} target="_blank" rel="noopener noreferrer">Go to Google Cloud to Enable API <ExternalLink className="ml-2 h-4 w-4"/></a>
                                      </Button>
                                  </div>

                                  <p className="text-xs pt-2">After checking both steps, click "Reload Page".</p>
                                </div>
                              ) : (
                                <>
                                  <p>Please check the following:</p>
                                  <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>Ensure your <strong>.env</strong> file has the correct Firebase project configuration.</li>
                                      <li>Verify that the API key is valid and has no restrictions.</li>
                                      <li>Check your browser's developer console for more specific error messages.</li>
                                  </ul>
                                  <p className="mt-4 font-mono text-xs bg-destructive/20 p-2 rounded">
                                      {initializationError.message}
                                  </p>
                                </>
                              )}
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
    if (isLoading) {
      return; // Don't do anything while auth is loading
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isLoading, pathname, router]);
  
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const needsRedirect = !isLoading && ((!user && !isPublicPath) || (user && pathname === '/login'));

  return (
    <>
        {needsRedirect && <RedirectLoader message="Redirecting..." />}
        {children}
    </>
  );
}
