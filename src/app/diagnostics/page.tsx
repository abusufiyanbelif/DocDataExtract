'use client';
import { useState } from 'react';
import { useFirestore, useUser, useAuth, useStorage } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { runDiagnosticCheck } from '@/ai/flows/run-diagnostic-check';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PlayCircle, ExternalLink, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


type TestResult = 'success' | 'failure' | 'pending';

interface DiagnosticCheck {
    name: string;
    status: TestResult;
    details: React.ReactNode;
    icon: React.ReactNode;
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
        const appCheck: DiagnosticCheck = { name: 'Firebase Initialization', status: 'pending', details: 'Checking if Firebase app is initialized...', icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" /> };
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
        const configCheck: DiagnosticCheck = { name: 'Firebase Configuration', status: 'pending', details: 'Verifying essential configuration values...', icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" /> };
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
        }
        setResults([...checks]);


        // 3. Firebase Authentication
        const authCheck: DiagnosticCheck = { name: 'Firebase Authentication', status: 'pending', details: 'Checking user authentication status...', icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" /> };
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
        const firestoreCheck: DiagnosticCheck = { name: 'Firestore Connectivity', status: 'pending', details: 'Attempting a public test read from the "user_lookups" collection...', icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" /> };
        checks.push(firestoreCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        if (firestore) {
            try {
                const lookupsRef = collection(firestore, 'user_lookups');
                const q = query(lookupsRef, limit(1));
                await getDocs(q);
                firestoreCheck.status = 'success';
                firestoreCheck.details = 'Successfully connected and performed a public read from Firestore. This confirms basic connectivity and that security rules allow public reads on "user_lookups".';
            } catch (error: any) {
                firestoreCheck.status = 'failure';
                firestoreCheck.details = `Firestore public read failed. This is likely a connectivity issue or a problem with your Security Rules for the "user_lookups" collection. Error: ${error.message}`;
            }
        } else {
            firestoreCheck.status = 'failure';
            firestoreCheck.details = 'Cannot perform Firestore test because the service is not initialized.';
        }
        setResults([...checks]);

        // 5. Firebase Storage Connectivity & Permissions
        const storageCheck: DiagnosticCheck = { name: 'Firebase Storage Write', status: 'pending', details: 'Attempting a test write to the "diagnostics" folder...', icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" /> };
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
        
        // 6. Genkit AI Connectivity
        const genkitCheck: DiagnosticCheck = { name: 'Genkit AI Connectivity', status: 'pending', details: 'Pinging the Gemini model via Genkit...', icon: <BrainCircuit className="h-6 w-6 text-primary" /> };
        checks.push(genkitCheck);
        setResults([...checks]);
        await new Promise(res => setTimeout(res, 300));
        try {
            const genkitResult = await runDiagnosticCheck();
            if (genkitResult.ok) {
                genkitCheck.status = 'success';
                genkitCheck.details = genkitResult.message;
            } else {
                genkitCheck.status = 'failure';
                genkitCheck.details = (
                    <div className="space-y-2">
                        <p>{genkitResult.message}</p>
                        {genkitResult.message.includes('API key') && (
                            <Alert variant="destructive">
                                <AlertTitle>Action Required</AlertTitle>
                                <AlertDescription>
                                    Please ensure you have a `GEMINI_API_KEY` environment variable set in a `.env` file in your project root.
                                </AlertDescription>
                            </Alert>
                        )}
                         {genkitResult.message.includes('permission denied') && (
                            <Alert variant="destructive">
                                <AlertTitle>Action Required</AlertTitle>
                                <AlertDescription>
                                    The API request was denied. Go to your Google Cloud project and ensure the 'Generative Language API' is enabled.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                );
            }
        } catch (error: any) {
            genkitCheck.status = 'failure';
            genkitCheck.details = `The diagnostic check itself failed to run. Error: ${error.message}`;
        }
        setResults([...checks]);

        setIsLoading(false);
    };

    const getStatusIcon = (status: TestResult) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failure':
                return <XCircle className="h-5 w-5 text-destructive" />;
            case 'pending':
                return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
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
                                        <div className="mt-1">{result.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{result.name}</h3>
                                                {getStatusIcon(result.status)}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">{result.details}</div>
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
