

'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useBranding, usePaymentSettings } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import Link from 'next/link';

import type { Lead } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, LogIn, Share2, Download } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';
import { ShareDialog } from '@/components/share-dialog';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

export default function PublicLeadSummaryPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params.leadId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareDialogData, setShareDialogData] = useState({ title: '', text: '', url: '' });
    const summaryRef = useRef<HTMLDivElement>(null);


    const leadDocRef = useMemo(() => (firestore && leadId) ? doc(firestore, 'leads', leadId) as DocumentReference<Lead> : null, [firestore, leadId]);
    const { data: lead, isLoading: isLeadLoading } = useDoc<Lead>(leadDocRef);
    
    const isLoading = isLeadLoading || isBrandingLoading || isPaymentLoading;

    const handleShare = async () => {
        if (!lead) return;
        
        const shareText = `
*Assalamualaikum Warahmatullahi Wabarakatuh*

🙏 *We Need Your Support!* 🙏

We are exploring a new initiative: *${lead.name}*.

*Details:*
${lead.description || 'To support those in need.'}

We are currently assessing the needs for this initiative. Your support and feedback are valuable.
        `.trim().replace(/^\s+/gm, '');


        const dataToShare = {
            title: `Lead: ${lead.name}`,
            text: shareText,
            url: window.location.href,
        };
        
        setShareDialogData(dataToShare);
        setIsShareDialogOpen(true);
    };

    const handleDownload = async () => {
        const element = summaryRef.current;
        if (!element) {
            toast({ title: 'Error', description: 'Cannot generate download, content is missing.', variant: 'destructive' });
            return;
        }

        try {
            const { default: jsPDF } = await import('jspdf');
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImageHeight = (imgProps.height * (pdfWidth - 20)) / imgProps.width;

            pdf.setTextColor(10, 41, 19);
            pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfImageHeight);

            pdf.save(`lead-summary-${leadId}.pdf`);
        } catch (error) {
            console.error("Download failed:", error);
            toast({ title: 'Download Failed', description: 'Could not generate the PDF.', variant: 'destructive' });
        }
    };


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
                    <div className="flex gap-2">
                        <Button onClick={handleDownload} variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                        <Button onClick={handleShare} variant="outline">
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                        <Button asChild>
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Organization members login
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="space-y-6 bg-background p-4" ref={summaryRef}>
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
                </div>
                 <ShareDialog 
                    open={isShareDialogOpen} 
                    onOpenChange={setIsShareDialogOpen} 
                    shareData={shareDialogData} 
                />
                 <div className="mt-8">
                    <AppFooter />
                 </div>
            </main>
        </div>
    );
}
