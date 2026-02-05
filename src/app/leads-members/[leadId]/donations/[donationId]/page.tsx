
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
import { ArrowLeft, Edit, Download, Loader2, Image as ImageIcon, FileText, MessageSquare, StickyNote, Share2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { ShareDialog } from '@/components/share-dialog';

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
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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
    
     const handleShare = () => {
        if (!donation || !lead) return;
        setIsShareDialogOpen(true);
    };

    const handleDownload = async (format: 'png' | 'pdf') => {
        const element = receiptRef.current;
        if (!element) {
            toast({ title: 'Error', description: 'Cannot generate download, content is missing.', variant: 'destructive' });
            return;
        }

        toast({ title: `Generating ${format.toUpperCase()}...`, description: 'Please wait.' });

        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#FFFFFF'
            });

            const fetchAsDataURL = async (url: string | null | undefined): Promise<string | null> => {
                if (!url) return null;
                try {
                    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
                    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
                    const blob = await response.blob();
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (error) {
                    console.error("Image fetch error:", error);
                    return null;
                }
            };
            
            const [logoDataUrl, qrDataUrl] = await Promise.all([
                fetchAsDataURL(brandingSettings?.logoUrl),
                fetchAsDataURL(paymentSettings?.qrCodeUrl)
            ]);

            const logoImg = logoDataUrl ? await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = logoDataUrl; }) : null;
            const qrImg = qrDataUrl ? await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = qrDataUrl; }) : null;

            if (format === 'png') {
                const PADDING = 40;
                const HEADER_HEIGHT = 140;
                const FOOTER_HEIGHT = 220;
                
                const finalCanvas = document.createElement('canvas');
                const contentWidth = Math.min(canvas.width, 1200);
                const contentHeight = (canvas.height * contentWidth) / canvas.width;

                finalCanvas.width = contentWidth + PADDING * 2;
                finalCanvas.height = contentHeight + HEADER_HEIGHT + FOOTER_HEIGHT + PADDING * 2;
                const ctx = finalCanvas.getContext('2d')!;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                if (logoImg) {
                    const wmScale = 0.8;
                    const wmWidth = finalCanvas.width * wmScale;
                    const wmHeight = (logoImg.height / logoImg.width) * wmWidth;
                    ctx.globalAlpha = 0.05;
                    ctx.drawImage(logoImg, (finalCanvas.width - wmWidth) / 2, (finalCanvas.height - wmHeight) / 2, wmWidth, wmHeight);
                    ctx.globalAlpha = 1.0;

                    const logoHeight = 120;
                    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
                    ctx.drawImage(logoImg, PADDING, PADDING, logoWidth, logoHeight);
                }
                
                ctx.fillStyle = 'rgb(10, 41, 19)';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', PADDING + 140, PADDING + 70);

                ctx.drawImage(canvas, PADDING, PADDING + HEADER_HEIGHT, contentWidth, contentHeight);
                
                const footerY = finalCanvas.height - FOOTER_HEIGHT - PADDING;
                if (qrImg) {
                    const qrSize = 200;
                    ctx.drawImage(qrImg, finalCanvas.width - PADDING - qrSize, footerY, qrSize, qrSize);
                }
                ctx.fillStyle = 'rgb(10, 41, 19)';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('For Donations & Contact', PADDING, footerY + 25);
                ctx.font = '14px sans-serif';
                let textY = footerY + 50;
                if (paymentSettings?.upiId) { ctx.fillText(`UPI: ${paymentSettings.upiId}`, PADDING, textY); textY += 20; }
                if (paymentSettings?.paymentMobileNumber) { ctx.fillText(`Phone: ${paymentSettings.paymentMobileNumber}`, PADDING, textY); textY += 20; }
                if (paymentSettings?.contactEmail) { ctx.fillText(`Email: ${paymentSettings.contactEmail}`, PADDING, textY); textY += 20; }
                if (paymentSettings?.address) { ctx.fillText(paymentSettings.address, PADDING, textY); }

                const link = document.createElement('a');
                link.download = `donation-receipt-${donationId}.png`;
                link.href = finalCanvas.toDataURL('image/png');
                link.click();
            } else { // PDF
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let position = 15;

                pdf.setTextColor(10, 41, 19);

                if (logoImg && logoDataUrl) {
                    const logoHeight = 40;
                    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
                    pdf.addImage(logoDataUrl, 'PNG', 15, position, logoWidth, logoHeight);
                    position += logoHeight + 5;
                }
                
                pdf.setFontSize(16);
                pdf.text(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', 15, position);
                position += 15;

                if (logoImg && logoDataUrl) {
                    pdf.saveGraphicsState();
                    pdf.setGState(new pdf.GState({ opacity: 0.05 }));
                    const wmWidth = pdfWidth * 0.75;
                    const wmHeight = (logoImg.height / logoImg.width) * wmWidth;
                    pdf.addImage(logoDataUrl, 'PNG', (pdfWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
                    pdf.restoreGraphicsState();
                }

                const imgData = canvas.toDataURL('image/png');
                const imgProps = pdf.getImageProperties(imgData);
                const contentHeight = (imgProps.height * (pdfWidth - 30)) / imgProps.width;

                pdf.addImage(imgData, 'PNG', 15, position, pdfWidth - 30, contentHeight);
                position += contentHeight + 10;
                
                if (position > pageHeight - 60) {
                    pdf.addPage();
                    position = 15;
                }
                pdf.setLineWidth(0.2);
                pdf.line(15, position, pdfWidth - 15, position);
                position += 8;
                
                pdf.setFontSize(12);
                pdf.text('For Donations & Contact', 15, position);
                let textY = position + 6;
                pdf.setFontSize(9);

                if (qrImg && qrDataUrl) {
                    const qrSize = 60;
                    const qrX = pdfWidth - 15 - qrSize;
                    pdf.addImage(qrDataUrl!, 'PNG', qrX, position, qrSize, qrSize);
                }
                
                if (paymentSettings?.upiId) { pdf.text(`UPI: ${paymentSettings.upiId}`, 15, textY); textY += 5; }
                if (paymentSettings?.paymentMobileNumber) { pdf.text(`Phone: ${paymentSettings.paymentMobileNumber}`, 15, textY); textY += 5; }
                if (paymentSettings?.address) {
                    const addressLines = pdf.splitTextToSize(paymentSettings.address, pdfWidth / 2 - 30);
                    pdf.text(addressLines, 15, textY);
                }

                pdf.save(`donation-receipt-${donationId}.pdf`);
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            const errorMessage = error.message ? `: ${error.message}` : '. Please check console for details.';
            toast({ title: 'Download Failed', description: `Could not generate the file${errorMessage}. This can happen if images are blocked by browser security.`, variant: 'destructive', duration: 9000});
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
                        <Button variant="outline" onClick={handleShare}>
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
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
                />
                 <ShareDialog 
                    open={isShareDialogOpen} 
                    onOpenChange={setIsShareDialogOpen} 
                    shareData={{
                        title: `Thank you for your donation!`,
                        text: `JazakAllah Khair for your generous donation of Rupee ${donation.amount.toFixed(2)} towards the "${lead.name}" initiative. May Allah accept it and bless you abundantly.`,
                        url: `${window.location.origin}/leads-public/${leadId}/summary`
                    }} 
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
