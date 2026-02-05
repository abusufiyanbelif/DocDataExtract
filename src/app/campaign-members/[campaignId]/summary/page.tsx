

'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useBranding } from '@/hooks/use-branding';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import type { SecurityRuleContext } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { doc, collection, updateDoc, query, where, DocumentReference } from 'firebase/firestore';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

import type { Campaign, Beneficiary, Donation, DonationCategory } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Target, Users, Gift, Edit, Save, Wallet, Share2, Hourglass, LogIn, Download, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from '@/components/ui/label';
import { get } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShareDialog } from '@/components/share-dialog';
import { AppFooter } from '@/components/app-footer';
import { Checkbox } from '@/components/ui/checkbox';
import { donationCategories } from '@/lib/modules';
import { Badge } from '@/components/ui/badge';


const donationTypeChartConfig = {
    Zakat: { label: "Zakat", color: "hsl(var(--chart-1))" },
    Sadqa: { label: "Sadqa", color: "hsl(var(--chart-2))" },
    Interest: { label: "Interest", color: "hsl(var(--chart-3))" },
    Lillah: { label: "Lillah", color: "hsl(var(--chart-4))" },
    Loan: { label: "Loan", color: "hsl(var(--chart-6))" },
    'Monthly Contribution': { label: "Monthly Contribution", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const donationPaymentTypeChartConfig = {
    Cash: { label: "Cash", color: "hsl(var(--chart-1))" },
    OnlinePayment: { label: "Online Payment", color: "hsl(var(--chart-2))" },
    Check: { label: "Check", color: "hsl(var(--chart-3))" },
    Other: { label: "Other", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

export default function CampaignSummaryPage() {
    const params = useParams();
    const campaignId = params.campaignId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userProfile, isLoading: isProfileLoading } = useSession();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();

    // State for edit mode and form fields
    const [editMode, setEditMode] = useState(false);
    const [editableCampaign, setEditableCampaign] = useState<Partial<Campaign>>({});
    const [donationChartFilter, setDonationChartFilter] = useState<'All' | 'Verified' | 'Pending' | 'Canceled'>('All');
    
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
    
    // Set editable campaign data when not in edit mode
    useEffect(() => {
        if (campaign && !editMode) {
             setEditableCampaign({
                name: campaign.name || '',
                description: campaign.description || '',
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
                category: campaign.category || 'General',
                status: campaign.status || 'Upcoming',
                targetAmount: campaign.targetAmount || 0,
                authenticityStatus: campaign.authenticityStatus || 'Pending Verification',
                publicVisibility: campaign.publicVisibility || 'Hold',
                allowedDonationTypes: campaign.allowedDonationTypes || [...donationCategories],
            });
        }
    }, [campaign, editMode]);
    
    const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
    const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
    const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
    const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;
    const canUpdate = userProfile?.role === 'Admin' || get(userProfile, 'permissions.campaigns.update', false) || get(userProfile, 'permissions.campaigns.summary.update', false);

    const handleSave = () => {
        if (!campaignDocRef || !userProfile || !canUpdate) return;
        
        const saveData: Partial<Campaign> = {
            name: editableCampaign.name || '',
            description: editableCampaign.description || '',
            startDate: editableCampaign.startDate || '',
            endDate: editableCampaign.endDate || '',
            category: editableCampaign.category || 'General',
            status: editableCampaign.status || 'Upcoming',
            targetAmount: editableCampaign.targetAmount || 0,
            authenticityStatus: editableCampaign.authenticityStatus || 'Pending Verification',
            publicVisibility: editableCampaign.publicVisibility || 'Hold',
            allowedDonationTypes: editableCampaign.allowedDonationTypes,
        };

        updateDoc(campaignDocRef, saveData)
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: campaignDocRef.path,
                    operation: 'update',
                    requestResourceData: saveData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                toast({ title: 'Success', description: 'Campaign summary updated.', variant: 'success' });
                setEditMode(false);
            });
    };
    
    const handleEditClick = () => {
        if (campaign) {
            setEditableCampaign({
                name: campaign.name || '',
                description: campaign.description || '',
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
                category: campaign.category || 'General',
                status: campaign.status || 'Upcoming',
                targetAmount: campaign.targetAmount || 0,
                authenticityStatus: campaign.authenticityStatus || 'Pending Verification',
                publicVisibility: campaign.publicVisibility || 'Hold',
                allowedDonationTypes: campaign.allowedDonationTypes || [...donationCategories],
            });
        }
        setEditMode(true);
    };

    const handleCancel = () => {
        setEditMode(false);
        // The useEffect will reset the editableCampaign state to match the campaign data
    };

    // Memoized calculations
    const summaryData = useMemo(() => {
        if (!beneficiaries || !donations || !campaign) return null;

        const verifiedDonationsList = donations.filter(d => d.status === 'Verified');
    
        const amountsByCategory: Record<DonationCategory, number> = donationCategories.reduce((acc, cat) => ({...acc, [cat]: 0}), {} as Record<DonationCategory, number>);

        verifiedDonationsList.forEach(d => {
            const splits = d.typeSplit && d.typeSplit.length > 0
                ? d.typeSplit
                : (d.type ? [{ category: d.type as DonationCategory, amount: d.amount }] : []);
            
            splits.forEach(split => {
                const category = (split.category as any) === 'General' ? 'Sadqa' : split.category;
                if (amountsByCategory.hasOwnProperty(category)) {
                    amountsByCategory[category as DonationCategory] += split.amount;
                }
            });
        });

        const verifiedNonZakatDonations = Object.entries(amountsByCategory)
            .filter(([category]) => category !== 'Zakat')
            .reduce((sum, [, amount]) => sum + amount, 0);

        const pendingDonations = donations
            .filter(d => d.status === 'Pending')
            .reduce((acc, d) => acc + d.amount, 0);

        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + (b.kitAmount || 0), 0);
        
        const fundingGoal = campaign.targetAmount || 0;
        const fundingProgress = fundingGoal > 0 ? (verifiedNonZakatDonations / fundingGoal) * 100 : 0;
        const pendingProgress = fundingGoal > 0 ? (pendingDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            const status = b.status || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const beneficiaryCategoryData = beneficiaries.reduce((acc, beneficiary) => {
            const categoryKey = beneficiary.members && beneficiary.members > 0 ? `${beneficiary.members}` : 'General';
            
            if (!acc[categoryKey]) {
                acc[categoryKey] = { count: 0, totalAmount: 0, beneficiaries: [] };
            }
            acc[categoryKey].count++;
            acc[categoryKey].totalAmount += beneficiary.kitAmount || 0;
            acc[categoryKey].beneficiaries.push(beneficiary);
            
            return acc;
        }, {} as Record<string, { count: number; totalAmount: number, beneficiaries: Beneficiary[] }>);

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

        const { donationChartData, donationPaymentTypeChartData } = (() => {
            let filteredDonations = donations;
            if (donationChartFilter !== 'All') {
                filteredDonations = donations.filter(d => d.status === donationChartFilter);
            }
            
            const donationTypeData = filteredDonations.reduce((acc, d) => {
                const splits = d.typeSplit && d.typeSplit.length > 0
                  ? d.typeSplit
                  : (d.type ? [{ category: d.type, amount: d.amount }] : []);
                
                splits.forEach(split => {
                    const category = split.category as any === 'General' ? 'Sadqa' : split.category;
                    if (donationCategories.includes(category)) {
                        acc[category] = (acc[category] || 0) + split.amount;
                    }
                });
                return acc;
            }, {} as Record<string, number>);
                
            const paymentTypeData = filteredDonations.reduce((acc, d) => {
                if (d.donationType) {
                    const key = d.donationType.replace(/\s+/g, '');
                    acc[key] = (acc[key] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            return {
                donationChartData: Object.entries(donationTypeData).map(([name, value]) => ({ name, value })),
                donationPaymentTypeChartData: Object.entries(paymentTypeData).map(([name, value]) => ({ name, value }))
            };
        })();

        return {
            verifiedNonZakatDonations,
            pendingDonations,
            totalKitAmountRequired,
            fundingProgress,
            pendingProgress,
            beneficiaryStatusData,
            beneficiaryCategoryBreakdown,
            donationChartData,
            donationPaymentTypeChartData,
            totalBeneficiaries: beneficiaries.length,
            targetAmount: campaign.targetAmount || 0,
            remainingToCollect: Math.max(0, fundingGoal - verifiedNonZakatDonations),
            amountsByCategory,
        };
    }, [beneficiaries, donations, campaign, donationChartFilter]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading || isProfileLoading || isBrandingLoading || isPaymentLoading;
    
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
            url: `${window.location.origin}/campaign-public/${campaignId}/summary`,
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
                backgroundColor: null,
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
                const HEADER_HEIGHT = 120;
                const FOOTER_HEIGHT = 200;
                
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
                    ctx.globalAlpha = 0.05;
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
                ctx.font = 'bold 28px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillText(brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur', headerTextX, (PADDING / 2) + 40);

                ctx.font = 'bold 24px sans-serif';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(campaign?.name || 'Campaign Summary', PADDING, HEADER_HEIGHT);
                
                ctx.drawImage(contentCanvas, PADDING, HEADER_HEIGHT + (PADDING/2));
                
                const footerY = finalCanvas.height - FOOTER_HEIGHT;
                if (qrImg) {
                    const qrSize = 180;
                    ctx.drawImage(qrImg, finalCanvas.width - PADDING - qrSize, footerY, qrSize, qrSize);
                }
                ctx.fillStyle = 'rgb(10, 41, 19)';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText('For Donations & Contact', PADDING, footerY + 25);
                ctx.font = '18px sans-serif';
                let textY = footerY + 55;
                if (paymentSettings?.upiId) { ctx.fillText(`UPI: ${paymentSettings.upiId}`, PADDING, textY); textY += 28; }
                if (paymentSettings?.contactPhone) { ctx.fillText(`Phone: ${paymentSettings.contactPhone}`, PADDING, textY); textY += 28; }
                if (paymentSettings?.website) { ctx.fillText(`Website: ${paymentSettings.website}`, PADDING, textY); textY += 28; }
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
                    pdf.setGState(new pdf.GState({ opacity: 0.05 }));
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

    if (!campaign) {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">Campaign not found.</p>
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
    
    const validLogoUrl = brandingSettings?.logoUrl?.trim() ? brandingSettings.logoUrl : null;

    return (
        <div className="min-h-screen text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/campaign-members">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Campaigns
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                     <div className="space-y-1">
                        {editMode ? (
                           <Input
                                id="name"
                                value={editableCampaign.name || ''}
                                onChange={(e) => setEditableCampaign(p => ({...p, name: e.target.value}))}
                                className="text-3xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold">{campaign.name}</h1>
                        )}
                        {editMode ? (
                             <Select
                                value={editableCampaign.status}
                                onValueChange={(value) => setEditableCampaign(p => ({...p, status: value as any}))}
                            >
                                <SelectTrigger className="w-fit border-0 shadow-none focus:ring-0 p-0 h-auto text-muted-foreground [&>svg]:ml-1">
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        ): (
                            <p className="text-muted-foreground">{campaign.status}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!editMode && (
                            <>
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
                            </>
                        )}
                        {canUpdate && userProfile && (
                            !editMode ? (
                                <Button onClick={handleEditClick}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Summary
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                                    <Button onClick={handleSave}>
                                        <Save className="mr-2 h-4 w-4" /> Save
                                    </Button>
                                </div>
                            )
                        )}
                        {!isProfileLoading && !userProfile && (
                            <Button asChild>
                                <Link href="/login">
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Organization members login
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="border-b mb-4">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex w-max space-x-4">
                            {userProfile && canReadSummary && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-primary text-primary shadow-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none" data-active="true">
                                  <Link href={`/campaign-members/${campaignId}/summary`}>Summary</Link>
                              </Button>
                            )}
                            {userProfile && canReadRation && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                                  <Link href={`/campaign-members/${campaignId}`}>{campaign.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
                              </Button>
                            )}
                            {userProfile && canReadBeneficiaries && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                                  <Link href={`/campaign-members/${campaignId}/beneficiaries`}>Beneficiary List</Link>
                              </Button>
                            )}
                            {userProfile && canReadDonations && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                                  <Link href={`/campaign-members/${campaignId}/donations`}>Donations</Link>
                              </Button>
                            )}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                <div className="relative space-y-6 p-4 bg-background" ref={summaryRef}>
                    {validLogoUrl && (
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(validLogoUrl)}`}
                            alt="Watermark"
                            crossOrigin="anonymous"
                            className="absolute inset-0 m-auto object-contain opacity-5 pointer-events-none"
                            style={{aspectRatio: '1 / 1'}}
                        />
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">Description</Label>
                                {editMode && canUpdate ? (
                                    <Textarea
                                        id="description"
                                        value={editableCampaign.description}
                                        onChange={(e) => setEditableCampaign(p => ({...p, description: e.target.value}))}
                                        className="mt-1"
                                        rows={4}
                                    />
                                ) : (
                                    <p className="mt-1 text-sm">{campaign.description || 'No description provided.'}</p>
                                )}
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="targetAmount" className="text-sm font-medium text-muted-foreground">Fundraising Goal (Target)</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="targetAmount"
                                            type="number"
                                            value={editableCampaign.targetAmount}
                                            onChange={(e) => setEditableCampaign(p => ({...p, targetAmount: Number(e.target.value) || 0}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">Rupee {(campaign.targetAmount || 0).toLocaleString('en-IN')}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="category" className="text-sm font-medium text-muted-foreground">Category</Label>
                                    {editMode && canUpdate ? (
                                        <Select
                                            value={editableCampaign.category}
                                            onValueChange={(value) => setEditableCampaign(p => ({...p, category: value as any}))}
                                        >
                                            <SelectTrigger id="category" className="mt-1">
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ration">Ration</SelectItem>
                                                <SelectItem value="Relief">Relief</SelectItem>
                                                <SelectItem value="General">General</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{campaign.category}</p>
                                    )}
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor="startDate" className="text-sm font-medium text-muted-foreground">Start Date</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={editableCampaign.startDate}
                                            onChange={(e) => setEditableCampaign(p => ({...p, startDate: e.target.value}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{campaign.startDate}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="endDate" className="text-sm font-medium text-muted-foreground">End Date</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={editableCampaign.endDate}
                                            onChange={(e) => setEditableCampaign(p => ({...p, endDate: e.target.value}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{campaign.endDate}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="authenticityStatus" className="text-sm font-medium text-muted-foreground">Authenticity Status</Label>
                                    {editMode && canUpdate ? (
                                        <Select
                                            value={editableCampaign.authenticityStatus}
                                            onValueChange={(value) => setEditableCampaign(p => ({...p, authenticityStatus: value as any}))}
                                        >
                                            <SelectTrigger id="authenticityStatus" className="mt-1">
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                                                <SelectItem value="Verified">Verified</SelectItem>
                                                <SelectItem value="On Hold">On Hold</SelectItem>
                                                <SelectItem value="Rejected">Rejected</SelectItem>
                                                <SelectItem value="Need More Details">Need More Details</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{campaign.authenticityStatus || 'N/A'}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="publicVisibility" className="text-sm font-medium text-muted-foreground">Public Visibility</Label>
                                    {editMode && canUpdate ? (
                                        <Select
                                            value={editableCampaign.publicVisibility}
                                            onValueChange={(value) => setEditableCampaign(p => ({...p, publicVisibility: value as any}))}
                                        >
                                            <SelectTrigger id="publicVisibility" className="mt-1">
                                                <SelectValue placeholder="Select visibility" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Hold">Hold (Private)</SelectItem>
                                                <SelectItem value="Ready to Publish">Ready to Publish</SelectItem>
                                                <SelectItem value="Published">Published</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{campaign.publicVisibility || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 pt-4">
                                <Label className="text-sm font-medium text-muted-foreground">Allowed Donation Types</Label>
                                {editMode && canUpdate ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-md">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="select-all"
                                            checked={editableCampaign.allowedDonationTypes?.length === donationCategories.length}
                                            onCheckedChange={(checked) => {
                                                setEditableCampaign(p => ({...p, allowedDonationTypes: checked ? [...donationCategories] : []}));
                                            }}
                                        />
                                        <Label htmlFor="select-all" className="font-bold">Any</Label>
                                    </div>
                                    {donationCategories.map(type => (
                                        <div key={type} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`type-${type}`}
                                            checked={editableCampaign.allowedDonationTypes?.includes(type)}
                                            onCheckedChange={(checked) => {
                                            const currentTypes = editableCampaign.allowedDonationTypes || [];
                                            const newTypes = checked ? [...currentTypes, type] : currentTypes.filter(t => t !== type);
                                            setEditableCampaign(p => ({...p, allowedDonationTypes: newTypes}));
                                            }}
                                        />
                                        <Label htmlFor={`type-${type}`}>{type}</Label>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(campaign.allowedDonationTypes && campaign.allowedDonationTypes.length > 0) ? (
                                            campaign.allowedDonationTypes.map(type => (
                                                <Badge key={type} variant="secondary">{type}</Badge>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Not specified.</p>
                                        )}
                                    </div>
                                )}
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

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
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
                                <CardTitle className="text-sm font-medium">Pending Donations Verification</CardTitle>
                                <Hourglass className="h-4 w-4 text-secondary-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.pendingDonations.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Verified Donations by Category</CardTitle>
                            <CardDescription>
                                Total verified funds collected for this campaign, broken down by category.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {donationCategories.map(category => (
                                <Card key={category}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">{category}</CardTitle>
                                        <Wallet className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">Rupee {summaryData?.amountsByCategory?.[category]?.toLocaleString('en-IN') ?? '0.00'}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Beneficiaries by Category</CardTitle>
                            <CardDescription>Breakdown of beneficiary counts and total kit amounts per member category.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {summaryData?.beneficiaryCategoryBreakdown && summaryData.beneficiaryCategoryBreakdown.length > 0 ? (
                                summaryData.beneficiaryCategoryBreakdown.map((item) => {
                                    const kitPrice = item.count > 0 ? item.totalAmount / item.count : 0;
                                    return (
                                        <div key={item.name} className="flex justify-between w-full p-4 border rounded-lg flex-wrap gap-2 items-center">
                                            <span className="font-medium text-foreground">{item.name === 'General' ? 'General' : `${item.name} Members`}</span>
                                            <span className="text-sm text-muted-foreground text-right">{item.count} {item.count === 1 ? 'beneficiary' : 'beneficiaries'} | Per Kit: Rupee {kitPrice.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Total: Rupee {item.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                    )
                                })
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



    