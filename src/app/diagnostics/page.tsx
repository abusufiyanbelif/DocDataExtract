'use client';
import { useState, useCallback } from 'react';
import { useAuth, useStorage, useFirestore } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { firebaseConfig } from '@/firebase/config';
import { collection, query, limit, getDocs, doc, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
import { runDiagnosticCheck } from '@/ai/flows/run-diagnostic-check';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PlayCircle, ExternalLink, BrainCircuit, Database } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TestResult = 'success' | 'failure' | 'pending';
type TestStatus = TestResult | 'running';

interface DiagnosticCheck {
    id: string;
    name: string;
    description: string;
    run: () => Promise<{ status: TestResult; details: React.ReactNode; }>;
    icon: React.ReactNode;
}

interface CheckResult {
    status: TestStatus;
    details: React.ReactNode;
}

export default function DiagnosticsPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const storage = useStorage();
    const { user } = useSession();
    
    const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});
    const [isAllRunning, setIsAllRunning] = useState(false);
    
    const diagnosticChecks: DiagnosticCheck[] = [
        {
            id: 'firebase-init',
            name: 'Firebase Initialization',
            description: 'Checks if core Firebase services are initialized.',
            icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" />,
            run: async () => {
                await new Promise(res => setTimeout(res, 300));
                if (firestore && auth && storage) {
                    return { status: 'success', details: 'Firebase services (Firestore, Auth, Storage) are available.' };
                } else {
                    return { status: 'failure', details: 'One or more Firebase services could not be initialized. Check your .env file and Firebase project settings.' };
                }
            },
        },
        {
            id: 'firebase-config',
            name: 'Firebase Configuration',
            description: 'Verifies essential configuration values in your environment.',
            icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" />,
            run: async () => {
                await new Promise(res => setTimeout(res, 300));
                if (firebaseConfig.projectId && firebaseConfig.storageBucket) {
                     return { status: 'success', details: `Project ID and Storage Bucket are present in the configuration.` };
                } else {
                    let missingVars = [];
                    if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
                    if (!firebaseConfig.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
                    return { status: 'failure', details: (
                        <span>
                            The following environment variables are missing from your configuration: <strong>{missingVars.join(', ')}</strong>. Please check your `.env` file.
                        </span>
                    ) };
                }
            },
        },
        {
            id: 'firebase-auth',
            name: 'Firebase Authentication',
            description: 'Checks the current user authentication status.',
            icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" />,
            run: async () => {
                await new Promise(res => setTimeout(res, 300));
                if (user) {
                    return { status: 'success', details: `Authenticated as ${user.email}.` };
                } else {
                    return { status: 'failure', details: 'No user is currently authenticated. Please log in to test authenticated routes.' };
                }
            },
        },
        {
            id: 'firestore-read',
            name: 'Firestore Connectivity',
            description: 'Attempts public reads from the "user_lookups" and "settings" collections.',
            icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" />,
            run: async () => {
                if (!firestore) {
                    return { status: 'failure', details: 'Cannot perform Firestore test because the service is not initialized.' };
                }
                try {
                    const lookupsRef = collection(firestore, 'user_lookups');
                    const settingsRef = collection(firestore, 'settings');
                    const q1 = query(lookupsRef, limit(1));
                    const q2 = query(settingsRef, limit(1));
                    await getDocs(q1);
                    await getDocs(q2);
                    return { status: 'success', details: 'Successfully connected and performed public reads from "user_lookups" and "settings". This confirms basic connectivity and security rules.' };
                } catch (error: any) {
                    return { status: 'failure', details: `Firestore public read failed. This could be a connectivity issue or a problem with your Security Rules. Error: ${error.message}` };
                }
            },
        },
        {
            id: 'admin-seed-check',
            name: 'Admin User Database Record',
            description: 'Verifies that the default admin user exists in the database.',
            icon: <Database className="h-6 w-6 text-primary" />,
            run: async () => {
                 if (!firestore) {
                    return { status: 'failure', details: 'Cannot perform Firestore test because the service is not initialized.' };
                }
                try {
                    const adminLookupSnap = await getDocs(query(collection(firestore, 'user_lookups'), where('userKey', '==', 'admin')));

                    if (adminLookupSnap.empty) {
                        return { status: 'failure', details: (
                            <span>
                                <strong>Admin user lookup record not found.</strong> This is required for login. Please run <strong>`npm run db:seed`</strong> from your terminal to create it.
                            </span>
                        )};
                    }
                    
                    const adminUserDocSnap = await getDocs(query(collection(firestore, 'users'), where('userKey', '==', 'admin')));

                    if (adminUserDocSnap.empty) {
                         return { status: 'failure', details: (
                            <span>
                                <strong>Admin user profile document not found.</strong> This is required for the application to function correctly. Please run <strong>`npm run db:seed`</strong> from your terminal.
                            </span>
                        )};
                    }

                    return { status: 'success', details: 'Default admin user database records are correctly set up.' };
                } catch (error: any) {
                    return { status: 'failure', details: `Failed to verify admin records. This may indicate a problem with your Firestore Security Rules. Error: ${error.message}` };
                }
            }
        },
        {
            id: 'storage-write',
            name: 'Firebase Storage Write',
            description: 'Attempts to write and delete a test file in Storage.',
            icon: <img src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/logo/2x/firebase_28.png" alt="Firebase" className="h-6 w-6" />,
            run: async () => {
                if (!user || !storage || !firebaseConfig.storageBucket) {
                    let reason = !user ? 'an authenticated user' : !firebaseConfig.storageBucket ? 'a configured Storage Bucket' : 'the Storage service';
                    return { status: 'failure', details: `Cannot perform Storage test without ${reason}.` };
                }
                
                const testFileRef = storageRef(storage, `diagnostics/${user.uid}/test.txt`);
                try {
                    const testBlob = new Blob(['This is a test file for diagnostics.'], { type: 'text/plain' });
                    await uploadBytes(testFileRef, testBlob);
                    await deleteObject(testFileRef); // Cleanup
                    return { status: 'success', details: 'Successfully wrote and deleted a file in Firebase Storage.' };
                } catch (error: any) {
                    if (error.code === 'storage/unauthorized') {
                        const storageRulesUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage/${firebaseConfig.storageBucket}/rules`;
                        return { status: 'failure', details: (
                            <div className="space-y-2">
                                <p><strong>Permission Denied.</strong> This is a Firebase Storage Security Rules issue.</p>
                                <p>Your rules do not allow the currently authenticated user to write files to their own diagnostics folder.</p>
                                <p><strong>Solution:</strong> Go to the Storage Rules editor in your Firebase console and add a rule allowing authenticated users to write to a path like `diagnostics/{'{userId}'}/{'{allPaths=**}'}`.</p>
                                <pre className="p-2 text-xs bg-muted rounded-md font-code">
    {`match /diagnostics/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }`}
                                </pre>
                                 <Button asChild variant="link" className="p-0 h-auto">
                                    <a href={storageRulesUrl} target="_blank" rel="noopener noreferrer">
                                        Open Storage Rules Editor <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                </Button>
                            </div>
                        )};
                    } else if (error.code === 'storage/bucket-not-found') {
                         return { status: 'failure', details: (
                            <span>
                                <strong>Bucket Not Found.</strong> The storage bucket <strong>{firebaseConfig.storageBucket}</strong> does not exist. Please verify the `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` value in your `.env` file.
                            </span>
                        )};
                    }
                    return { status: 'failure', details: `Storage write failed. Error: ${error.message} (Code: ${error.code})` };
                }
            },
        },
        {
            id: 'genkit-ai',
            name: 'Genkit AI Connectivity',
            description: 'Pings the Gemini model via a Genkit server-side flow.',
            icon: <BrainCircuit className="h-6 w-6 text-primary" />,
            run: async () => {
                try {
                    const genkitResult = await runDiagnosticCheck();
                    if (genkitResult.ok) {
                        return { status: 'success', details: genkitResult.message };
                    } else {
                        return { status: 'failure', details: (
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
                        )};
                    }
                } catch (error: any) {
                    let details: React.ReactNode = `The diagnostic check itself failed to run. Error: ${error.message}`;
                    if (error.message.includes('can only export async functions')) {
                        details = (
                            <div className="space-y-2">
                                <p><strong>`'use server'` Configuration Error.</strong> A file marked with `'use server'` is improperly exporting a non-function object. This commonly happens if the core Genkit configuration file (`src/ai/genkit.ts`) contains the `'use server'` directive.</p>
                                <p><strong>Solution:</strong> Ensure that `'use server'` is removed from `src/ai/genkit.ts`. This directive should only be in your flow files (e.g., `src/ai/flows/your-flow.ts`).</p>
                                <p className="font-mono text-xs bg-muted p-2 rounded-md">Error Details: {error.message}</p>
                            </div>
                        );
                    }
                    return { status: 'failure', details };
                }
            },
        }
    ];

    const runSingleCheck = useCallback(async (check: DiagnosticCheck) => {
        setCheckResults(prev => ({
            ...prev,
            [check.id]: { status: 'running', details: 'Running test...' }
        }));
        
        const result = await check.run();

        setCheckResults(prev => ({
            ...prev,
            [check.id]: { status: result.status, details: result.details }
        }));
    }, [user]);

    const runAllChecks = async () => {
        setIsAllRunning(true);
        const initialResults: Record<string, CheckResult> = {};
        diagnosticChecks.forEach(check => {
            initialResults[check.id] = { status: 'pending', details: 'Waiting to run...' };
        });
        setCheckResults(initialResults);

        for (const check of diagnosticChecks) {
            await runSingleCheck(check);
        }
        setIsAllRunning(false);
    };

    const getStatusIcon = (status: TestStatus) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failure':
                return <XCircle className="h-5 w-5 text-destructive" />;
            case 'running':
                return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
            case 'pending':
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen text-foreground">
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
                        <p className="text-muted-foreground">Run tests to check the connectivity and configuration of required application resources.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Button onClick={runAllChecks} disabled={isAllRunning}>
                            {isAllRunning ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <PlayCircle className="mr-2 h-4 w-4" />
                            )}
                            Run All Tests
                        </Button>
                        
                        <div className="space-y-4">
                            {diagnosticChecks.map((check) => {
                                const result = checkResults[check.id];
                                const isLoading = result?.status === 'running';
                                return (
                                    <div key={check.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                        <div className="mt-1">{check.icon}</div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold">{check.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{check.description}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {result && getStatusIcon(result.status)}
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => runSingleCheck(check)}
                                                        disabled={isAllRunning || isLoading}
                                                    >
                                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Run Test
                                                    </Button>
                                                </div>
                                            </div>
                                            {result && result.status !== 'pending' && result.status !== 'running' && (
                                                <div className="text-sm text-muted-foreground pt-2 border-t">
                                                    <strong className="text-foreground">Result:</strong> {result.details}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
