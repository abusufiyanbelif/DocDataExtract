'use client';
import { useState } from 'react';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PlayCircle } from 'lucide-react';
import Link from 'next/link';

type TestResult = 'success' | 'failure' | 'pending';

interface DiagnosticCheck {
    name: string;
    status: TestResult;
    details: string;
}

export default function DiagnosticsPage() {
    const firestore = useFirestore();
    const auth = useAuth();
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
        if (firestore && auth) {
            appCheck.status = 'success';
            appCheck.details = 'Firebase services (Firestore, Auth) are available.';
        } else {
            appCheck.status = 'failure';
            appCheck.details = 'Firebase services could not be initialized. Check .env file and Firebase project settings.';
            setResults([...checks]);
            setIsLoading(false);
            return;
        }
        setResults([...checks]);

        // 2. Firebase Authentication
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
        
        // 3. Firestore Connectivity & Permissions
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
                                        <div>{getStatusIcon(result.status)}</div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{result.name}</h3>
                                            <p className="text-sm text-muted-foreground">{result.details}</p>
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
