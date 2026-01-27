'use client';
import { useState } from 'react';
import { useFirestore, useUser, useAuth, useStorage } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type TestResult = 'success' | 'failure' | 'pending';

interface DiagnosticCheck {
    name: string;
    status: TestResult;
    details: React.ReactNode;
}

export default function DiagnosticsPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const storage = useStorage();
    const { user } = useUser();
    const [results, setResults] = useState<DiagnosticCheck[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const runChecks = async () => {
        setIsLoading(true);
        const checks: DiagnosticCheck[] = [];

        // 1. Firebase App Initialization
        const appCheck: DiagnosticCheck = { name: 'Firebase Initialization', status: 'pending', details: 'Checking if Firebase app is initialized...' };
        checks.push(appCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (firestore && auth && storage) {
            appCheck.status = 'success';
            appCheck.details = 'Firebase services (Firestore, Auth, Storage) are available.';
        } else {
            appCheck.status = 'failure';
            appCheck.details = 'One or more Firebase services could not be initialized. Check your .env file and Firebase project settings.';
            setResults([...checks]);
            setIsLoading(false);
            return;
        }
        setResults([...checks]);
        
        // 2. Firebase Configuration Check
        const configCheck: DiagnosticCheck = { name: 'Firebase Configuration', status: 'pending', details: 'Verifying essential configuration values...' };
        checks.push(configCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (firebaseConfig.projectId && firebaseConfig.storageBucket) {
             configCheck.status = 'success';
             configCheck.details = `Project ID and Storage Bucket are present in the configuration.`;
        } else {
            configCheck.status = 'failure';
            let missingVars = [];
            if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
            if (!firebaseConfig.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
            configCheck.details = (
                <span>
                    The following environment variables are missing from your configuration: <strong>{missingVars.join(', ')}</strong>. Please check your `.env` file.
                </span>
            );
            setResults([...checks]);
            // Do not stop here, allow other tests to run
        }
        setResults([...checks]);


        // 3. Firebase Authentication
        const authCheck: DiagnosticCheck = { name: 'Firebase Authentication', status: 'pending', details: 'Checking user authentication status...' };
        checks.push(authCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (user) {
            authCheck.status = 'success';
            authCheck.details = `Authenticated as ${user.email}.`;
        } else {
            authCheck.status = 'failure';
            authCheck.details = 'No user is currently authenticated. Please log in to test Firestore rules.';
        }
        setResults([...checks]);
        
        // 4. Firestore Connectivity & Permissions
        const firestoreCheck: DiagnosticCheck = { name: 'Firestore Connectivity', status: 'pending', details: 'Attempting a test read from the "campaigns" collection...' };
        checks.push(firestoreCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (user && firestore) {
            try {
                const campaignsRef = collection(firestore, 'campaigns');
                const q = query(campaignsRef, limit(1));
                await getDocs(q);
                firestoreCheck.status = 'success';
                firestoreCheck.details = 'Successfully connected and read from Firestore. Security rules for "campaigns" collection appear to be working for signed-in users.';
            } catch (error: any) {
                firestoreCheck.status = 'failure';
                firestoreCheck.details = `Firestore read failed. This could be a connectivity issue or a problem with Security Rules. Error: ${error.message}`;
            }
        } else {
            firestoreCheck.status = 'failure';
            firestoreCheck.details = 'Cannot perform Firestore test without an authenticated user.';
        }
        setResults([...checks]);

        // 5. Firebase Storage Connectivity & Permissions
        const storageCheck: DiagnosticCheck = { name: 'Firebase Storage Write', status: 'pending', details: 'Attempting a test write to the "diagnostics" folder...' };
        checks.push(storageCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (user && storage && firebaseConfig.storageBucket) {
            const testFileRef = storageRef(storage, 'diagnostics/test.txt');
            try {
                const testBlob = new Blob(['This is a test file for diagnostics.'], { type: 'text/plain' });
                await uploadBytes(testFileRef, testBlob);
                storageCheck.status = 'success';
                storageCheck.details = 'Successfully wrote a file to Firebase Storage.';
                // Clean up the test file
                await deleteObject(testFileRef);
            } catch (error: any) {
                storageCheck.status = 'failure';
                if (error.code === 'storage/unauthorized') {
                    const storageRulesUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage/${firebaseConfig.storageBucket}/rules`;
                    storageCheck.details = (
                        <div className="space-y-2">
                            <p><strong>Permission Denied.</strong> This is a Firebase Storage Security Rules issue.</p>
                            <p>Your rules do not allow the currently authenticated user to write files.</p>
                            <p><strong>Solution:</strong> Go to the Storage Rules editor in your Firebase console and replace the contents with the following:</p>
                            <pre className="p-2 text-xs bg-muted rounded-md font-code">
{`service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                            </pre>
                             <Button asChild variant="link" className="p-0 h-auto">
                                <a href={storageRulesUrl} target="_blank" rel="noopener noreferrer">
                                    Open Storage Rules Editor <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                            </Button>
                        </div>
                    );
                } else if (error.code === 'storage/bucket-not-found') {
                     storageCheck.details = (
                        <span>
                            <strong>Bucket Not Found.</strong> The storage bucket <strong>{firebaseConfig.storageBucket}</strong> does not exist. Please verify the `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` value in your `.env` file.
                        </span>
                    );
                } else {
                    storageCheck.details = `Storage write failed with an unexpected error. Error: ${error.message} (Code: ${error.code})`;
                }
            }
        } else if (!firebaseConfig.storageBucket) {
             storageCheck.status = 'failure';
             storageCheck.details = 'Cannot perform Storage test because the Storage Bucket is not configured in your app. Please set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in your .env file.';
        } else {
            storageCheck.status = 'failure';
            storageCheck.details = 'Cannot perform Storage test without an authenticated user.';
        }
        setResults([...checks]);
        
        setIsLoading(false);
    };

    const getStatusIcon = (status: TestResult) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-6 w-6 text-green-500" />;
            case 'failure':
                return <XCircle className="h-6 w-6 text-destructive" />;
            case 'pending':
                return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
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
                        <CardTitle>System Diagnostics</CardTitle>
                        <p className="text-muted-foreground">This page runs a series of tests to check the connectivity and configuration of required application resources.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button onClick={runChecks} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <PlayCircle className="mr-2 h-4 w-4" />
                            )}
                            Run Diagnostic Tests
                        </Button>
                        
                        {results.length > 0 && (
                             <div className="space-y-4">
                                {results.map((result, index) => (
                                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                                        <div className="mt-1">{getStatusIcon(result.status)}</div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{result.name}</h3>
                                            <div className="text-sm text-muted-foreground">{result.details}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
