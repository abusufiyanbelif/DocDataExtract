
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, collection, updateDoc, query, where, DocumentReference } from 'firebase/firestore';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import html2canvas from 'html2canvas';

import type { Lead, Beneficiary, Donation } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Users, Gift, Edit, Save, Wallet, Hourglass, Share2, ImageDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function LeadSummaryPage() {
    const params = useParams();
    const leadId = params.leadId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    const [editMode, setEditMode] = useState(false);
    const [editableLead, setEditableLead] = useState<Partial<Lead>>({});
    const [donationChartFilter, setDonationChartFilter] = useState<'All' | 'Verified' | 'Pending' | 'Canceled'>('All');
    
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareDialogData, setShareDialogData] = useState({ title: '', text: '', url: '' });
    const summaryRef = useRef<HTMLDivElement>(null);
    
    const leadDocRef = useMemo(() => (firestore && leadId) ? doc(firestore, 'leads', leadId) as DocumentReference<Lead> : null, [firestore, leadId]);
    const beneficiariesCollectionRef = useMemo(() => (firestore && leadId) ? collection(firestore, `leads/${leadId}/beneficiaries`) : null, [firestore, leadId]);
    const donationsCollectionRef = useMemo(() => {
        if (!firestore || !leadId) return null;
        return query(collection(firestore, 'donations'), where('leadId', '==', leadId));
    }, [firestore, leadId]);

    const { data: lead, isLoading: isLeadLoading } = useDoc<Lead>(leadDocRef);
    const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);
    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    
    useEffect(() => {
        if (lead && !editMode) {
             setEditableLead({
                name: lead.name || '',
                description: lead.description || '',
                startDate: lead.startDate || '',
                endDate: lead.endDate || '',
                category: lead.category || 'General',
                status: lead.status || 'Upcoming',
                targetAmount: lead.targetAmount || 0,
            });
        }
    }, [lead, editMode]);
    
    const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.summary?.read;
    const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.ration?.read;
    const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.beneficiaries?.read;
    const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.donations?.read;
    const canUpdate = userProfile?.role === 'Admin' || get(userProfile, 'permissions.leads.update', false) || get(userProfile, 'permissions.leads.summary.update', false);

    const handleSave = () => {
        if (!leadDocRef || !userProfile || !canUpdate) return;
        
        const saveData = {
            name: editableLead.name || '',
            description: editableLead.description || '',
            startDate: editableLead.startDate || '',
            endDate: editableLead.endDate || '',
            category: editableLead.category || 'General',
            status: editableLead.status || 'Upcoming',
            targetAmount: editableLead.targetAmount || 0,
        };

        updateDoc(leadDocRef, saveData)
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: leadDocRef.path,
                    operation: 'update',
                    requestResourceData: saveData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                toast({ title: 'Success', description: 'Lead summary updated.', variant: 'success' });
                setEditMode(false);
            });
    };
    
    const handleEditClick = () => {
        if (lead) {
            setEditableLead({
                name: lead.name || '',
                description: lead.description || '',
                startDate: lead.startDate || '',
                endDate: lead.endDate || '',
                category: lead.category || 'General',
                status: lead.status || 'Upcoming',
                targetAmount: lead.targetAmount || 0,
            });
        }
        setEditMode(true);
    };

    const handleCancel = () => {
        setEditMode(false);
    };

    const summaryData = useMemo(() => {
        if (!beneficiaries || !donations || !lead) return null;

        const verifiedDonationsList = donations.filter(d => d.status === 'Verified');
    
        const zakatCollected = verifiedDonationsList
            .filter(d => d.type === 'Zakat')
            .reduce((acc, d) => acc + d.amount, 0);

        const verifiedNonZakatDonations = verifiedDonationsList
            .filter(d => d.type !== 'Zakat')
            .reduce((acc, d) => acc + d.amount, 0);

        const pendingDonations = donations
            .filter(d => d.status === 'Pending')
            .reduce((acc, d) => acc + d.amount, 0);

        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + (b.kitAmount || 0), 0);
        
        const fundingGoal = lead.targetAmount || 0;
        const fundingProgress = fundingGoal > 0 ? (verifiedNonZakatDonations / fundingGoal) * 100 : 0;
        const pendingProgress = fundingGoal > 0 ? (pendingDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            const status = b.status || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const beneficiaryCategoryData = beneficiaries.reduce((acc, beneficiary) => {
            const members = beneficiary.members;
            const categoryKey = members && members > 0 ? `${members} Members` : 'General';
            
            if (!acc[categoryKey]) {
                acc[categoryKey] = { count: 0, totalAmount: 0 };
            }
            acc[categoryKey].count++;
            acc[categoryKey].totalAmount += beneficiary.kitAmount || 0;
            
            return acc;
        }, {} as Record<string, { count: number; totalAmount: number }>);

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
                    acc[d.type] = (acc[d.type] || 0) + d.amount;
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
            targetAmount: lead.targetAmount || 0,
            remainingToCollect: Math.max(0, fundingGoal - verifiedNonZakatDonations),
        };
    }, [beneficiaries, donations, lead, donationChartFilter]);
    
    const handleShare = async () => {
        if (!lead || !summaryData) {
            toast({
                title: 'Error',
                description: 'Cannot share, summary data is not available.',
                variant: 'destructive',
            });
            return;
        }

        const remainingToCollectText = summaryData.remainingToCollect > 0 
            ? `*Remaining: Rupee ${summaryData.remainingToCollect.toLocaleString('en-IN')}*`
            : `*Funding goal achieved! Thank you!*`;

        const categoryBreakdownText = summaryData.beneficiaryCategoryBreakdown.length > 0 
            ? `\n*Beneficiary Breakdown:*\n${summaryData.beneficiaryCategoryBreakdown.map(item => `${item.name}: ${item.count} ${item.count === 1 ? 'beneficiary' : 'beneficiaries'} (Required Rupee ${item.totalAmount.toLocaleString('en-IN')})`).join('\n')}`
            : '';

        const shareText = `
*Help Us with this Lead!*

*Lead: ${lead.name}*
${lead.description || ''}

*Financial Summary:*
Target Goal: Rupee ${(summaryData.targetAmount || 0).toLocaleString('en-IN')}
Funds Collected (Verified): Rupee ${summaryData.verifiedNonZakatDonations.toLocaleString('en-IN')}
${remainingToCollectText}

We have identified *${summaryData.totalBeneficiaries} potential beneficiaries*.${categoryBreakdownText}

Please consider donating and share this message.
        `.trim().replace(/^\s+/gm, '');

        const dataToShare = {
            title: `Lead Summary: ${lead.name}`,
            text: shareText,
            url: `${window.location.origin}/leads-public/${leadId}/summary`,
        };
        
        setShareDialogData(dataToShare);
        setIsShareDialogOpen(true);
    };

    const handleDownloadScreenshot = () => {
        if (!summaryRef.current) return;

        toast({
            title: 'Generating Screenshot...',
            description: 'Please wait while the summary image is being created.',
        });

        html2canvas(summaryRef.current, {
            allowTaint: true,
            useCORS: true,
            scale: 2,
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `lead-summary-${leadId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            link.remove();
            toast({
                title: 'Download Started',
                description: 'Your screenshot is being downloaded.',
                variant: 'success'
            });
        }).catch(err => {
            console.error("Screenshot generation failed:", err);
            toast({
                title: 'Screenshot Failed',
                description: 'Could not generate the screenshot.',
                variant: 'destructive',
            });
        });
    };

    const isLoading = isLeadLoading || areBeneficiariesLoading || areDonationsLoading || isProfileLoading;
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">Lead not found.</p>
                    <Button asChild className="mt-4">
                        <Link href="/leads">
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
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/leads">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Leads
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                     <div className="space-y-1">
                        {editMode ? (
                           <Input
                                id="name"
                                value={editableLead.name || ''}
                                onChange={(e) => setEditableLead(p => ({...p, name: e.target.value}))}
                                className="text-3xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold">{lead.name}</h1>
                        )}
                        {editMode ? (
                             <Select
                                value={editableLead.status}
                                onValueChange={(value) => setEditableLead(p => ({...p, status: value as any}))}
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
                            <p className="text-muted-foreground">{lead.status}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!editMode && (
                            <>
                                <Button onClick={handleDownloadScreenshot} variant="outline">
                                    <ImageDown className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
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
                    </div>
                </div>

                <div className="border-b mb-4">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex w-max space-x-4">
                            {userProfile && canReadSummary && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none" data-active="true">
                                  <Link href={`/leads/${leadId}/summary`}>Summary</Link>
                              </Button>
                            )}
                            {userProfile && canReadRation && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                                  <Link href={`/leads/${leadId}`}>{lead.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
                              </Button>
                            )}
                            {userProfile && canReadBeneficiaries && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                                  <Link href={`/leads/${leadId}/beneficiaries`}>Beneficiary List</Link>
                              </Button>
                            )}
                            {userProfile && canReadDonations && (
                              <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                                  <Link href={`/leads/${leadId}/donations`}>Donations</Link>
                              </Button>
                            )}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                <div ref={summaryRef} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">Description</Label>
                                {editMode && canUpdate ? (
                                    <Textarea
                                        id="description"
                                        value={editableLead.description}
                                        onChange={(e) => setEditableLead(p => ({...p, description: e.target.value}))}
                                        className="mt-1"
                                        rows={4}
                                    />
                                ) : (
                                    <p className="mt-1 text-sm">{lead.description || 'No description provided.'}</p>
                                )}
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="targetAmount" className="text-sm font-medium text-muted-foreground">Fundraising Goal (Target)</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="targetAmount"
                                            type="number"
                                            value={editableLead.targetAmount}
                                            onChange={(e) => setEditableLead(p => ({...p, targetAmount: Number(e.target.value) || 0}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">Rupee {(lead.targetAmount || 0).toLocaleString('en-IN')}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-muted-foreground">Calculated Kit Costs</Label>
                                    <p className="mt-1 text-lg font-semibold">Rupee {(summaryData?.totalKitAmountRequired ?? 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="category" className="text-sm font-medium text-muted-foreground">Category</Label>
                                    {editMode && canUpdate ? (
                                        <Select
                                            value={editableLead.category}
                                            onValueChange={(value) => setEditableLead(p => ({...p, category: value as any}))}
                                        >
                                            <SelectTrigger id="category" className="mt-1">
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ration">Ration</SelectItem>
                                                <SelectItem value="Relief">Relief</SelectItem>
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="Education">Education</SelectItem>
                                                <SelectItem value="Medical">Medical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{lead.category}</p>
                                    )}
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor="startDate" className="text-sm font-medium text-muted-foreground">Start Date</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={editableLead.startDate}
                                            onChange={(e) => setEditableLead(p => ({...p, startDate: e.target.value}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{lead.startDate}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="endDate" className="text-sm font-medium text-muted-foreground">End Date</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={editableLead.endDate}
                                            onChange={(e) => setEditableLead(p => ({...p, endDate: e.target.value}))}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">{lead.endDate}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Funding Progress</CardTitle>
                            <CardDescription>
                                Rupee {summaryData?.verifiedNonZakatDonations.toLocaleString('en-IN') ?? 0} of Rupee {(summaryData?.targetAmount ?? 0).toLocaleString('en-IN')} funded from non-Zakat donations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                                <div 
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${summaryData?.fundingProgress || 0}%` }}
                                ></div>
                                <div 
                                    className="absolute top-0 h-full bg-orange-500 transition-all"
                                    style={{ 
                                        left: `${summaryData?.fundingProgress || 0}%`, 
                                        width: `${summaryData?.pendingProgress || 0}%`
                                    }}
                                ></div>
                            </div>
                            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                    Verified
                                </div>
                                <div className="flex items-center">
                                    <span className="h-2 w-2 rounded-full bg-orange-500 mr-2"></span>
                                    Pending Verification
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Funding (Verified)</CardTitle>
                                <Gift className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.verifiedNonZakatDonations.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Zakat Collected (Verified)</CardTitle>
                                <Wallet className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.zakatCollected.toLocaleString('en-IN') ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Donations</CardTitle>
                                <Hourglass className="h-4 w-4 text-orange-500" />
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
                            <div className="space-y-4">
                                {summaryData?.beneficiaryCategoryBreakdown && summaryData.beneficiaryCategoryBreakdown.length > 0 ? (
                                    summaryData.beneficiaryCategoryBreakdown.map((item, index) => (
                                        <React.Fragment key={item.name}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-foreground">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.count} {item.count === 1 ? 'beneficiary' : 'beneficiaries'}
                                                    </p>
                                                </div>
                                                <p className="font-mono text-right text-foreground">Required Rupee {item.totalAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                            {index < summaryData.beneficiaryCategoryBreakdown.length - 1 && <Separator />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No beneficiaries to display.</p>
                                )}
                            </div>
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
                                             {summaryData?.donationChartData.map((entry) => (
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
                                            {summaryData?.donationPaymentTypeChartData.map((entry) => (
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
