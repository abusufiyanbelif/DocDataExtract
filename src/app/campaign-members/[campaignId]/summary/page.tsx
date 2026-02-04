

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

import type { Campaign, Beneficiary, Donation } from '@/lib/types';
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


const donationTypeChartConfig = {
    Zakat: { label: "Zakat", color: "hsl(var(--chart-1))" },
    Sadqa: { label: "Sadqa", color: "hsl(var(--chart-2))" },
    Interest: { label: "Interest", color: "hsl(var(--chart-3))" },
    Lillah: { label: "Lillah", color: "hsl(var(--chart-4))" },
    General: { label: "General", color: "hsl(var(--chart-5))" },
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
        
        const saveData = {
            name: editableCampaign.name || '',
            description: editableCampaign.description || '',
            startDate: editableCampaign.startDate || '',
            endDate: editableCampaign.endDate || '',
            category: editableCampaign.category || 'General',
            status: editableCampaign.status || 'Upcoming',
            targetAmount: editableCampaign.targetAmount || 0,
            authenticityStatus: editableCampaign.authenticityStatus || 'Pending Verification',
            publicVisibility: editableCampaign.publicVisibility || 'Hold',
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
    
        let zakatCollected = 0;
        let verifiedNonZakatDonations = 0;

        verifiedDonationsList.forEach(d => {
            (d.typeSplit || []).forEach(split => {
                if (split.category === 'Zakat') {
                    zakatCollected += split.amount;
                } else {
                    verifiedNonZakatDonations += split.amount;
                }
            });
        });

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
                (d.typeSplit || []).forEach(split => {
                    acc[split.category] = (acc[split.category] || 0) + split.amount;
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
            zakatCollected,
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

        const images = Array.from(element.getElementsByTagName('img'));
        const promises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });
        });

        try {
            await Promise.all(promises);
        } catch (error: any) {
            console.error("Image loading failed for download:", error);
            toast({ title: 'Download Failed', description: `Could not load an image required for the download. ${error.message}`, variant: 'destructive' });
            return;
        }

        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                backgroundColor: null,
            });
            
            const imgData = canvas.toDataURL('image/png');

            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `campaign-summary-${campaignId}.png`;
                link.href = imgData;
                link.click();
            } else { // pdf
                const { default: jsPDF } = await import('jspdf');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                let position = 20;

                // Add Header (Logo and Title)
                if (brandingSettings?.logoUrl?.trim()) {
                    try {
                        const proxiedLogoUrl = `/api/image-proxy?url=${encodeURIComponent(brandingSettings.logoUrl)}`;
                        const logoImg = new Image();
                        logoImg.src = proxiedLogoUrl;
                        await new Promise<void>((resolve, reject) => {
                            logoImg.onload = () => resolve();
                            logoImg.onerror = (err) => reject(err);
                        });
                        pdf.addImage(logoImg, 'PNG', 15, 5, 30, 10);
                    } catch (e) {
                        console.warn("Could not add logo to PDF", e);
                    }
                }
                pdf.setFontSize(16);
                pdf.text(campaign?.name || 'Campaign Summary', 50, 12);
                pdf.setLineWidth(0.5);
                pdf.line(15, 18, pdfWidth - 15, 18);
                
                const canvasAspectRatio = canvas.width / canvas.height;
                const printableWidth = pdfWidth - 20; // 10mm margin on each side
                const printableHeight = printableWidth / canvasAspectRatio;

                pdf.addImage(imgData, 'PNG', 10, position, printableWidth, printableHeight);
                
                let finalY = position + printableHeight + 10;
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

                if (paymentSettings?.qrCodeUrl?.trim()) {
                    try {
                        const proxiedQrUrl = `/api/image-proxy?url=${encodeURIComponent(paymentSettings.qrCodeUrl)}`;
                        const qrImg = new Image();
                        qrImg.src = proxiedQrUrl;
                        await new Promise<void>((resolve, reject) => {
                            qrImg.onload = () => resolve();
                            qrImg.onerror = (err) => reject(err);
                        });
                        pdf.addImage(qrImg, 'PNG', qrX, finalY - 2, qrSize, qrSize);
                    } catch(e) {
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
    const proxiedLogoUrl = validLogoUrl ? `/api/image-proxy?url=${encodeURIComponent(validLogoUrl)}` : null;

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
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none" data-active="true">
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

                <div className="relative space-y-6 p-4" ref={summaryRef}>
                    {proxiedLogoUrl && (
                        <img
                            src={proxiedLogoUrl}
                            alt="Watermark"
                            className="absolute inset-0 m-auto object-contain opacity-5 pointer-events-none"
                            style={{
                                width: '75%',
                                height: '75%',
                            }}
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

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                <CardTitle>{donationChartFilter} Donations by Category</CardTitle>
                                    <Select value={donationChartFilter} onValueChange={(value: any) => setDonationChartFilter(value)}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Filter status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All</SelectItem>
                                            <SelectItem value="Verified">Verified</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Canceled">Canceled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={donationTypeChartConfig} className="h-[300px] w-full">
                                    <BarChart data={summaryData?.donationChartData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickFormatter={(value) => `Rupee ${Number(value).toLocaleString('en-IN')}`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Bar
                                            dataKey="value"
                                            radius={4}
                                        >
                                             {summaryData?.donationChartData && summaryData.donationChartData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{donationChartFilter} Donations by Payment Type</CardTitle>
                                <CardDescription>Count of donations per payment type.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <ChartContainer
                                    config={donationPaymentTypeChartConfig}
                                    className="mx-auto aspect-square h-full"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={<ChartTooltipContent nameKey="name" />}
                                        />
                                        <Pie
                                            data={summaryData?.donationPaymentTypeChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                        >
                                            {summaryData?.donationPaymentTypeChartData && summaryData.donationPaymentTypeChartData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name.replace(/\s+/g, '')})`} />
                                            ))}
                                        </Pie>
                                        <ChartLegend
                                            content={<ChartLegendContent nameKey="name" />}
                                        />
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
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
