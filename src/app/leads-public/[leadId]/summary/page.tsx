
'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import Link from 'next/link';

import type { Lead } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';


export default function PublicLeadSummaryPage() {
    const params = useParams();
    const leadId = params.leadId as string;
    const firestore = useFirestore();

    const leadDocRef = useMemo(() => (firestore && leadId) ? doc(firestore, 'leads', leadId) as DocumentReference<Lead> : null, [firestore, leadId]);
    const { data: lead, isLoading: isLeadLoading } = useDoc<Lead>(leadDocRef);
    
    const isLoading = isLeadLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lead || lead.authenticityStatus !== 'Verified' || lead.publicVisibility !== 'Published') {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">This lead could not be found or is not publicly available.</p>
                    <Button asChild className="mt-4">
                        <Link href="/leads-public">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Public Leads
                        </Link>
                    </Button>
                </main>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                 <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/leads-public">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Public Leads
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                     <div className="space-y-1">
                        <h1 className="text-3xl font-bold">{lead.name}</h1>
                        <p className="text-muted-foreground">{lead.status}</p>
                    </div>
                     <Button asChild>
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Organization members login
                        </Link>
                    </Button>
                </div>

                <div className="space-y-6 bg-background p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="mt-1 text-sm">{lead.description || 'No description provided.'}</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Target Amount</p>
                                    <p className="mt-1 text-lg font-semibold">Rupee {(lead.targetAmount ?? 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                                    <p className="mt-1 text-lg font-semibold">{lead.category}</p>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                                    <p className="mt-1 text-lg font-semibold">{lead.startDate}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                                    <p className="mt-1 text-lg font-semibold">{lead.endDate}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <AppFooter />
                </div>
            </main>
        </div>
    );
}
