

'use client';

import { useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { useBranding } from '@/hooks/use-branding';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import { doc, DocumentReference, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { useToast } from '@/hooks/use-toast';

import type { Donation, Lead, BrandingSettings, PaymentSettings } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { DonationReceipt } from '@/components/donation-receipt';
import { DonationForm, type DonationFormData } from '@/components/donation-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Download, Loader2, Image as ImageIcon, FileText, MessageSquare, StickyNote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function DonationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params.leadId as string;
    const donationId = params.donationId as string;
    
    const firestore = useFirestore();
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);

    const { userProfile, isLoading: isProfileLoading } = useSession();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();

    const [isFormOpen, setIsFormOpen] = useState(false);

    const leadDocRef = useMemo(() => (firestore && leadId) ? doc(firestore, 'leads', leadId) as DocumentReference<Lead> : null, [firestore, leadId]);
    const donationDocRef = useMemo(() => (firestore && donationId) ? doc(firestore, 'donations', donationId) as DocumentReference<Donation> : null, [firestore, donationId]);
    
    const { data: lead, isLoading: isLeadLoading } = useDoc<Lead>(leadDocRef);
    const { data: donation, isLoading: isDonationLoading } = useDoc<Donation>(donationDocRef);

    const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.['leads-members']?.donations?.update;

    const handleFormSubmit = async (data: DonationFormData) => {
        if (!firestore || !leadId || !lead || !userProfile || !canUpdate || !donation) return;

        setIsFormOpen(false);

        const docRef = doc(firestore, 'donations', donation.id);
        
        let finalData: Partial<Donation> = {
            ...data,
            campaignId: leadId,
            campaignName: lead.name,
        };
        // Don't handle files here, as this is an edit on an existing item. The donation form should handle file updates.
        delete (finalData as any).screenshotFile;
        delete (finalData as any).screenshotDeleted;
        delete (finalData as any).isTransactionIdRequired;

        try {
            await setDoc(docRef, finalData, { merge: true });
            toast({ title: 'Success', description: `Donation updated.`, variant: 'success' });
        } catch (error: any) {
            console.warn("Error during form submission:", error);
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: finalData,
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({ title: 'Save Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
            }
        }
    };
    
    const handleDownload = async (format: 'png' | 'pdf') => {
        const element = receiptRef.current;
        if (!element) {
            toast({ title: 'Error', description: 'Cannot generate download, content is missing.', variant: 'destructive' });
            return;
        }

        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#FFFFFF'
            });
            const imgData = canvas.toDataURL('image/png');

            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `donation-receipt-${donationId}.png`;
                link.href = imgData;
                link.click();
            } else { // PDF
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                const imgProps = pdf.getImageProperties(imgData);
                const pdfImageHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                let heightLeft = pdfImageHeight;
                let position = 0;
                
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImageHeight);
                heightLeft -= pageHeight;
                
                while (heightLeft > 0) {
                    position = heightLeft - pdfImageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImageHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save(`donation-receipt-${donationId}.pdf`);
            }
        } catch (error) {
            console.error("Download failed:", error);
            toast({ title: 'Download Failed', description: 'Could not generate the file. Please try again.', variant: 'destructive' });
        }
    };

    const isLoading = isProfileLoading || isBrandingLoading || isPaymentLoading || isLeadLoading || isDonationLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!donation || !lead) {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">Donation or Lead not found.</p>
                    <Button asChild className="mt-4">
                        <Link href="/leads-members">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Leads
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
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <Button variant="outline" asChild>
                        <Link href={`/leads-members/${leadId}/donations`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Donations
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        {canUpdate && (
                            <Button onClick={() => setIsFormOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Receipt
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleDownload('png')}>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    As Image (PNG)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    As PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {!userProfile && (
                     <Alert variant="destructive" className="mb-4">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>You are not logged in</AlertTitle>
                        <AlertDescription>
                            You are viewing this as a public user. Some actions may be unavailable.
                        </AlertDescription>
                    </Alert>
                )}
                
                <DonationReceipt 
                    ref={receiptRef}
                    donation={donation} 
                    campaign={lead} 
                    brandingSettings={brandingSettings} 
                    paymentSettings={paymentSettings} 
                />

                {(donation.comments || donation.suggestions) && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Additional Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {donation.comments && (
                                <div className="space-y-1">
                                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><MessageSquare/>Comments</h3>
                                    <p className="pl-6">{donation.comments}</p>
                                </div>
                            )}
                             {donation.suggestions && (
                                <div className="space-y-1">
                                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><StickyNote/>Suggestions</h3>
                                    <p className="pl-6">{donation.suggestions}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}


                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Donation</DialogTitle>
                        </DialogHeader>
                        <DonationForm
                            donation={donation}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
