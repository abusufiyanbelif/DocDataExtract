

'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { useBranding } from '@/hooks/use-branding';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import { doc, collection, query, where, DocumentReference } from 'firebase/firestore';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import type { Campaign, Beneficiary, Donation, DonationCategory } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Target, Users, Gift, LogIn, Wallet, Share2, Hourglass, Download, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from '@/components/share-dialog';
import { AppFooter } from '@/components/app-footer';
import { donationCategories } from '@/lib/modules';

export default function PublicCampaignSummaryPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();
    
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareDialogData, setShareDialogData] = useState({ title: '', text: '', url: '' });

    const summaryRef = useRef<HTMLDivElement>(null);

    // Data fetching
    const campaignDocRef = useMemo(() => (firestore && campaignId) ? doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign> : null, [firestore, campaignId]);
    const beneficiariesCollectionRef = useMemo(() => (firestore && campaignId) ? collection(firestore, `campaigns/${campaignId}/beneficiaries`) : null, [firestore, campaignId]);
    const donationsCollectionRef = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId]);

    const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
    const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);
    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    
    // Memoized calculations
    const summaryData = useMemo(() => {
        if (!beneficiaries || !donations || !campaign) return null;
        
        const verifiedDonationsList = donations.filter(d => d.status === 'Verified');
    
        const amountsByCategory: Record<DonationCategory, number> = donationCategories.reduce((acc, cat) => ({...acc, [cat]: 0}), {} as Record<DonationCategory, number>);

        verifiedDonationsList.forEach(d => {
            if (d.typeSplit && d.typeSplit.length > 0) {
                d.typeSplit.forEach(split => {
                    if (donationCategories.includes(split.category)) {
                        amountsByCategory[split.category as DonationCategory] += split.amount;
                    }
                });
            } else if (d.type && donationCategories.includes(d.type as DonationCategory)) {
                amountsByCategory[d.type as DonationCategory] += d.amount;
            }
        });

        const verifiedNonZakatDonations = Object.entries(amountsByCategory)
            .filter(([category]) => category !== 'Zakat')
            .reduce((sum, [, amount]) => sum + amount, 0);
        
        const zakatCollected = amountsByCategory['Zakat'] || 0;

        const pendingDonations = donations
            .filter(d => d.status === 'Pending')
            .reduce((acc, d) => acc + d.amount, 0);

        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + (b.kitAmount || 0), 0);
        
        const fundingGoal = totalKitAmountRequired;
        const fundingProgress = fundingGoal > 0 ? (verifiedNonZakatDonations / fundingGoal) * 100 : 0;
        const pendingProgress = fundingGoal > 0 ? (pendingDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            const status = b.status || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const beneficiaryCategoryData = beneficiaries.reduce((acc, beneficiary) => {
            const members = beneficiary.members;
            const categoryKey = members && members > 0 ? `${members}` : 'General';
            
            if (!acc[categoryKey]) {
                acc[categoryKey] = { count: 0, totalAmount: 0, beneficiaries: [] };
            }
            acc[categoryKey].count++;
            acc[categoryKey].totalAmount += beneficiary.kitAmount || 0;
            acc[categoryKey].beneficiaries.push(beneficiary);
            
            return acc;
        }, {} as Record<string, { count: number; totalAmount: number; beneficiaries: Beneficiary[] }>);

        const beneficiaryCategoryBreakdown = Object.entries(beneficiaryCategoryData).map(([name, data]) => ({
            name,
            ...data
        })).sort((a, b) => {
            if (a.name === 'General') return 1;
            if (b.name === 'General') return -1;
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return bNum - aNum;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            verifiedNonZakatDonations,
            zakatCollected,
            pendingDonations,
            totalKitAmountRequired,
            fundingProgress,
            pendingProgress,
            beneficiaryStatusData,
            beneficiaryCategoryBreakdown,
            totalBeneficiaries: beneficiaries.length,
            targetAmount: totalKitAmountRequired,
            remainingToCollect: Math.max(0, totalKitAmountRequired - verifiedNonZakatDonations),
        };
    }, [beneficiaries, donations, campaign]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading || isBrandingLoading || isPaymentLoading;
    
    const handleShare = async () => {
        if (!campaign || !summaryData) {
            toast({
                title: 'Error',
                description: 'Cannot share, summary data is not available.',
                variant: 'destructive',
            });
            return;
        }

        const shareText = `
*Assalamualaikum Warahmatullahi Wabarakatuh*

🙏 *We Need Your Support!* 🙏

Join us for the *${campaign.name}* campaign as we work to provide essential aid to our community.

*Our Goal:*
${campaign.description || 'To support those in need.'} We aim to support *${summaryData.totalBeneficiaries} beneficiaries*.

*Financial Update:*
🎯 Target for Kits: Rupee ${summaryData.targetAmount.toLocaleString('en-IN')}
✅ Collected (Verified): Rupee ${summaryData.verifiedNonZakatDonations.toLocaleString('en-IN')}
⏳ Remaining: *Rupee ${summaryData.remainingToCollect.toLocaleString('en-IN')}*

Your contribution, big or small, makes a huge difference.

*Please donate and share this message.*
        `.trim().replace(/^\s+/gm, '');


        const dataToShare = {
            title: `Campaign Summary: ${campaign.name}`,
            text: shareText,
            url: window.location.href,
        };
        
        setShareDialogData(dataToShare);
        setIsShareDialogOpen(true);
    };

    const handleDownload = async (format: 'png' | 'pdf') => {
        const element = summaryRef.current;
        if (!element) {
            toast({ title: 'Error', description: 'Cannot generate download, content is missing.', variant: 'destructive' });
            return;
        }

        toast({ title: `Generating ${format.toUpperCase()}...`, description: 'Please wait.' });

        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: null
            });

            const fetchAsDataURL = async (url: string | null): Promise<string | null> => {
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
                fetchAsDataURL(brandingSettings?.logoUrl || null),
                fetchAsDataURL(paymentSettings?.qrCodeUrl || null)
            ]);

            const logoImg = logoDataUrl ? await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = logoDataUrl; }) : null;
            const qrImg = qrDataUrl ? await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = qrDataUrl; }) : null;
            
            if (format === 'png') {
                const PADDING = 40;
                const HEADER_HEIGHT = 100;
                const FOOTER_HEIGHT = 180;
                
                const contentCanvas = canvas;

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = contentCanvas.width + PADDING * 2;
                finalCanvas.height = contentCanvas.height + HEADER_HEIGHT + FOOTER_HEIGHT + PADDING;
                const ctx = finalCanvas.getContext('2d')!;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                if (logoImg) {
                    const wmScale = 0.8;
                    const wmWidth = finalCanvas.width * wmScale;
                    const wmHeight = (logoImg.height / logoImg.width) * wmWidth;
                    ctx.globalAlpha = 0.25;
                    ctx.drawImage(logoImg, (finalCanvas.width - wmWidth) / 2, (finalCanvas.height - wmHeight) / 2, wmWidth, wmHeight);
                    ctx.globalAlpha = 1.0;
                }

                let headerTextX = PADDING;
                if (logoImg) {
                    const logoHeight = 80;
                    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
                    ctx.drawImage(logoImg, PADDING, PADDING / 2, logoWidth, logoHeight);
                    headerTextX = PADDING + logoWidth + 20;
                }

                ctx.fillStyle = 'rgb(10, 41, 19)';
                ctx.font = 'bold 22px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillText(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', headerTextX, (PADDING / 2) + 40);

                ctx.font = 'bold 20px sans-serif';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(campaign?.name || 'Campaign Summary', PADDING, HEADER_HEIGHT);
                
                ctx.drawImage(contentCanvas, PADDING, HEADER_HEIGHT + (PADDING/2));
                
                const footerY = finalCanvas.height - FOOTER_HEIGHT;
                if (qrImg) {
                    const qrSize = 200;
                    ctx.drawImage(qrImg, finalCanvas.width - PADDING - qrSize, footerY, qrSize, qrSize);
                }
                ctx.fillStyle = 'rgb(10, 41, 19)';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('For Donations & Contact', PADDING, footerY + 25);
                ctx.font = '16px sans-serif';
                let textY = footerY + 50;
                if (paymentSettings?.upiId) { ctx.fillText(`UPI: ${paymentSettings.upiId}`, PADDING, textY); textY += 24; }
                if (paymentSettings?.contactPhone) { ctx.fillText(`Phone: ${paymentSettings.contactPhone}`, PADDING, textY); textY += 24; }
                if (paymentSettings?.website) { ctx.fillText(`Website: ${paymentSettings.website}`, PADDING, textY); textY += 24; }
                if (paymentSettings?.address) { ctx.fillText(paymentSettings.address, PADDING, textY); }

                const link = document.createElement('a');
                link.download = `campaign-summary-${campaignId}.png`;
                link.href = finalCanvas.toDataURL('image/png');
                link.click();
            } else { // pdf
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const pageCenter = pdfWidth / 2;
                let position = 15;

                pdf.setTextColor(10, 41, 19);

                // Header with Logo and Org Name
                if (logoImg && logoDataUrl) {
                    const logoHeight = 15;
                    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
                    pdf.addImage(logoDataUrl, 'PNG', 15, position, logoWidth, logoHeight);
                    pdf.setFontSize(18);
                    // Vertically center the text with the logo
                    const textY = position + (logoHeight / 2) + 3;
                    pdf.text(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', 15 + logoWidth + 5, textY);
                    position += logoHeight + 10;
                } else {
                    pdf.setFontSize(18);
                    pdf.text(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', pageCenter, position, { align: 'center' });
                    position += 15;
                }
                
                // Document Title
                pdf.setFontSize(22).text(campaign?.name || 'Campaign Summary', pageCenter, position, { align: 'center' });
                position += 15;

                if (logoImg && logoDataUrl) {
                    pdf.saveGraphicsState();
                    pdf.setGState(new pdf.GState({ opacity: 0.25 }));
                    const wmWidth = pdfWidth * 0.75;
                    const wmHeight = (logoImg.height / logoImg.width) * wmWidth;
                    pdf.addImage(logoDataUrl, 'PNG', (pdfWidth - wmWidth) / 2, (pageHeight - wmHeight) / 2, wmWidth, wmHeight);
                    pdf.restoreGraphicsState();
                }

                const imgData = canvas.toDataURL('image/png');
                const contentHeight = (canvas.height * (pdfWidth - 30)) / canvas.width;
                
                if (position + contentHeight > pageHeight - 40) {
                     pdf.addPage();
                     position = 15;
                }

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
                
                if (qrImg) {
                    const qrSize = 30;
                    const qrX = pdfWidth - 15 - qrSize;
                    pdf.addImage(qrDataUrl!, 'PNG', qrX, position - 2, qrSize, qrSize);
                }
                
                if (paymentSettings?.upiId) { pdf.text(`UPI: ${paymentSettings.upiId}`, 15, textY); textY += 5; }
                if (paymentSettings?.paymentMobileNumber) { pdf.text(`Phone: ${paymentSettings.paymentMobileNumber}`, 15, textY); textY += 5; }
                if (paymentSettings?.contactEmail) { pdf.text(`Email: ${paymentSettings.contactEmail}`, 15, textY); textY += 5; }
                if (paymentSettings?.website) { pdf.text(`Website: ${paymentSettings.website}`, 15, textY); textY += 5; }
                if (paymentSettings?.pan) { pdf.text(`PAN: ${paymentSettings.pan}`, 15, textY); textY += 5; }
                if (paymentSettings?.regNo) { pdf.text(`Reg No: ${paymentSettings.regNo}`, 15, textY); textY += 5; }
                if (paymentSettings?.address) {
                    const addressLines = pdf.splitTextToSize(paymentSettings.address, pdfWidth - 30 - 40);
                    pdf.text(addressLines, 15, textY);
                }
                
                pdf.save(`campaign-summary-${campaignId}.pdf`);
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            const errorMessage = error.message ? `: ${error.message}` : '. Please check console for details.';
            toast({ title: 'Download Failed', description: `Could not generate the file${errorMessage}. This can happen if images are blocked by browser security.`, variant: 'destructive', duration: 9000});
        }
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!campaign || campaign.authenticityStatus !== 'Verified' || campaign.publicVisibility !== 'Published') {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">This campaign could not be found or is not publicly available.</p>
                    <Button asChild className="mt-4">
                        <Link href="/campaign-public">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Public Campaigns
                        </Link>
                    </Button>
                </main>
            </div>
        );
    }

    const validLogoUrl = brandingSettings?.logoUrl?.trim() ? brandingSettings.logoUrl : null;
    
    return (
        <div className="min-h-screen text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                 <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/campaign-public">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Campaigns
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                     <div className="space-y-1">
                        <h1 className="text-3xl font-bold">{campaign.name}</h1>
                        <p className="text-muted-foreground">{campaign.status}</p>
                    </div>
                     <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleDownload('png')}>Download as Image (PNG)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload('pdf')}>Download as PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleShare} variant="outline">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                        <Button asChild>
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Organization members login
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="space-y-6 p-4" ref={summaryRef}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="mt-1 text-sm">{campaign.description || 'No description provided.'}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Target Amount (Calculated)</p>
                                    <p className="mt-1 text-lg font-semibold">Rupee {(summaryData?.targetAmount ?? 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                                    <p className="mt-1 text-lg font-semibold">{campaign.category}</p>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                                    <p className="mt-1 text-lg font-semibold">{campaign.startDate}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                                    <p className="mt-1 text-lg font-semibold">{campaign.endDate}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Funding Progress (for Kits)</CardTitle>
                            <CardDescription>
                                Rupee {summaryData?.verifiedNonZakatDonations.toLocaleString('en-IN') ?? 0} of Rupee {(summaryData?.targetAmount ?? 0).toLocaleString('en-IN')} funded from non-Zakat donations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                                <div 
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${summaryData?.fundingProgress || 0}%` }}
                                ></div>
                                <div 
                                    className="absolute top-0 h-full bg-secondary transition-all"
                                    style={{ 
                                        left: `${summaryData?.fundingProgress || 0}%`, 
                                        width: `${summaryData?.pendingProgress || 0}%`
                                    }}
                                ></div>
                            </div>
                            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                                    Verified
                                </div>
                                <div className="flex items-center">
                                    <span className="h-2 w-2 rounded-full bg-secondary mr-2"></span>
                                    Pending Verification
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Kit Amount Required</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.totalKitAmountRequired.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Kit Funding (Verified)</CardTitle>
                                <Gift className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.verifiedNonZakatDonations.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Zakat Collected (Verified)</CardTitle>
                                <Wallet className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.zakatCollected.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Donations Verification</CardTitle>
                                <Hourglass className="h-4 w-4 text-secondary-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.pendingDonations.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Beneficiary Status</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold mb-2">{summaryData?.totalBeneficiaries ?? 0} Total</div>
                                <div className="space-y-1 text-sm">
                                    {summaryData?.beneficiaryStatusData && Object.entries(summaryData.beneficiaryStatusData).map(([name, value]) => (
                                        <div key={name} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--color-${name.replace(/\s+/g, '')})` }} />
                                                <span>{name}</span>
                                            </div>
                                            <span className="font-medium text-foreground">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Beneficiaries by Category</CardTitle>
                            <CardDescription>Breakdown of beneficiary counts and total kit amounts per member category.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {summaryData?.beneficiaryCategoryBreakdown && summaryData.beneficiaryCategoryBreakdown.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-center">Beneficiaries</TableHead>
                                            <TableHead className="text-right">Kit Price (Rupee)</TableHead>
                                            <TableHead className="text-right">Total Kit Amount (Rupee)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summaryData.beneficiaryCategoryBreakdown.map((item) => {
                                            const kitPrice = item.count > 0 ? item.totalAmount / item.count : 0;
                                            return (
                                                <TableRow key={item.name}>
                                                    <TableCell className="font-medium">{item.name === 'General' ? 'General' : `${item.name} Members`}</TableCell>
                                                    <TableCell className="text-center">{item.count}</TableCell>
                                                    <TableCell className="text-right font-mono">{kitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right font-mono">{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No beneficiaries to display.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ShareDialog 
                    open={isShareDialogOpen} 
                    onOpenChange={setIsShareDialogOpen} 
                    shareData={shareDialogData} 
                />
            </main>
        </div>
    );
}



    

    

