
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

import type { Donation, Campaign, BrandingSettings, PaymentSettings } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { DonationReceipt } from '@/components/donation-receipt';
import { DonationForm, type DonationFormData } from '@/components/donation-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Download, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function DonationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as string;
    const donationId = params.donationId as string;
    
    const firestore = useFirestore();
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);

    const { userProfile, isLoading: isProfileLoading } = useSession();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();

    const [isFormOpen, setIsFormOpen] = useState(false);

    const campaignDocRef = useMemo(() => (firestore && campaignId) ? doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign> : null, [firestore, campaignId]);
    const donationDocRef = useMemo(() => (firestore && donationId) ? doc(firestore, 'donations', donationId) as DocumentReference<Donation> : null, [firestore, donationId]);
    
    const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
    const { data: donation, isLoading: isDonationLoading } = useDoc<Donation>(donationDocRef);

    const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.update;

    const handleFormSubmit = async (data: DonationFormData) => {
        if (!firestore || !campaignId || !campaign || !userProfile || !canUpdate || !donation) return;

        setIsFormOpen(false);

        const docRef = doc(firestore, 'donations', donation.id);
        
        let finalData: Partial<Donation> = {
            ...data,
            campaignId: campaignId,
            campaignName: campaign.name,
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
        if (!receiptRef.current) {
            toast({ title: 'Error', description: 'Cannot generate download, content is missing.', variant: 'destructive' });
            return;
        }
        
        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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
                
                // Add receipt image
                const imgProps = pdf.getImageProperties(imgData);
                const pdfImageHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImageHeight);
                
                let finalY = pdfImageHeight + 10;
                const footerHeight = 60; // Estimated footer height

                if (finalY + footerHeight > pageHeight) {
                    pdf.addPage();
                    finalY = 20;
                }

                // --- Footer ---
                pdf.setLineWidth(0.2);
                pdf.line(15, finalY, pdfWidth - 15, finalY);
                finalY += 8;

                pdf.setFontSize(12);
                pdf.text('For Donations & Contact', 15, finalY);
                finalY += 6;
                pdf.setFontSize(9);
                
                const qrSize = 30;
                const qrX = pdfWidth - 15 - qrSize;

                if (paymentSettings?.qrCodeUrl) {
                    try {
                        const qrImg = new Image();
                        qrImg.crossOrigin = 'anonymous';
                        qrImg.src = paymentSettings.qrCodeUrl;
                        await new Promise<void>((resolve, reject) => {
                            qrImg.onload = () => resolve();
                            qrImg.onerror = (err) => reject(new Error('QR Code image failed to load.'));
                        });
                        pdf.addImage(qrImg, 'PNG', qrX, finalY - 2, qrSize, qrSize);
                    } catch (e) {
                        console.warn("Could not add QR code to PDF", e);
                    }
                }
                
                if (paymentSettings?.upiId) {
                    pdf.text(`UPI: ${paymentSettings.upiId}`, 15, finalY);
                    finalY += 5;
                }
                if (paymentSettings?.paymentMobileNumber) {
                    pdf.text(`Phone: ${paymentSettings.paymentMobileNumber}`, 15, finalY);
                    finalY += 5;
                }
                if (paymentSettings?.contactEmail) {
                    pdf.text(`Email: ${paymentSettings.contactEmail}`, 15, finalY);
                    finalY += 5;
                }
                if (paymentSettings?.pan) {
                    pdf.text(`PAN: ${paymentSettings.pan}`, 15, finalY);
                    finalY += 5;
                }
                if (paymentSettings?.regNo) {
                    pdf.text(`Reg No: ${paymentSettings.regNo}`, 15, finalY);
                    finalY += 5;
                }
                if (paymentSettings?.address) {
                    const addressLines = pdf.splitTextToSize(paymentSettings.address, pdfWidth - qrSize - 30);
                    pdf.text(addressLines, 15, finalY);
                }
                
                pdf.save(`donation-receipt-${donationId}.pdf`);
            }
        } catch (error) {
            console.error("Download failed:", error);
            toast({ title: 'Download Failed', description: 'Could not generate the file. Please try again.', variant: 'destructive' });
        }
    };

    const isLoading = isProfileLoading || isBrandingLoading || isPaymentLoading || isCampaignLoading || isDonationLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!donation || !campaign) {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">Donation or Campaign not found.</p>
                    <Button asChild className="mt-4">
                        <Link href="/campaign-members">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Campaigns
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
                        <Link href={`/campaign-members/${campaignId}/donations`}>
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
                    campaign={campaign} 
                    brandingSettings={brandingSettings} 
                    paymentSettings={paymentSettings} 
                />

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
