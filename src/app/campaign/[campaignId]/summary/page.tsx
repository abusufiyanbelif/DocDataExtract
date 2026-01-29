'use client';

import { useMemo, useState, useEffect } from 'react';
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
  ResponsiveContainer,
} from 'recharts';

import type { Campaign, Beneficiary, Donation } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Target, Users, Gift, Edit, Save, Wallet, Share2, Hourglass } from 'lucide-react';
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


const donationTypeChartConfig = {
    Zakat: { label: "Zakat", color: "hsl(var(--chart-1))" },
    Sadqa: { label: "Sadqa", color: "hsl(var(--chart-2))" },
    Interest: { label: "Interest", color: "hsl(var(--chart-3))" },
    Lillah: { label: "Lillah", color: "hsl(var(--chart-4))" },
    General: { label: "General", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const beneficiaryStatusConfig = {
    Given: { label: "Given", color: "hsl(var(--chart-1))" },
    Pending: { label: "Pending", color: "hsl(var(--chart-2))" },
    Hold: { label: "Hold", color: "hsl(var(--chart-3))" },
    "NeedMoreDetails": { label: "Need More Details", color: "hsl(var(--chart-4))" },
    "Verified": { label: "Verified", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

export default function CampaignSummaryPage() {
    const params = useParams();
    const campaignId = params.campaignId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    // State for edit mode and form fields
    const [editMode, setEditMode] = useState(false);
    const [editableCampaign, setEditableCampaign] = useState<Partial<Campaign>>({});
    const [donationChartFilter, setDonationChartFilter] = useState<'All' | 'Verified' | 'Pending' | 'Canceled'>('Verified');
    const [isSharing, setIsSharing] = useState(false);

    // Data fetching
    const campaignDocRef = useMemo(() => (firestore && !isProfileLoading && userProfile) ? doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign> : null, [firestore, campaignId, isProfileLoading, userProfile]);
    const beneficiariesCollectionRef = useMemo(() => (firestore && !isProfileLoading && userProfile) ? collection(firestore, `campaigns/${campaignId}/beneficiaries`) : null, [firestore, campaignId, isProfileLoading, userProfile]);
    const donationsCollectionRef = useMemo(() => {
        if (!firestore || !campaignId || isProfileLoading || !userProfile) return null;
        return query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId, isProfileLoading, userProfile]);

    const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
    const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);
    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    
    // Set editable campaign data when not in edit mode
    useEffect(() => {
        if (campaign && !editMode) {
             setEditableCampaign({
                name: campaign.name || '',
                description: campaign.description || '',
                targetAmount: campaign.targetAmount || 0,
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
                category: campaign.category || 'General',
                status: campaign.status || 'Upcoming',
            });
        }
    }, [campaign, editMode]);
    
    const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
    const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
    const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
    const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;
    const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.update;

    const handleSave = () => {
        if (!campaignDocRef || !userProfile || !canUpdate) return;
        
        const saveData = {
            name: editableCampaign.name || '',
            description: editableCampaign.description || '',
            targetAmount: Number(editableCampaign.targetAmount) || 0,
            startDate: editableCampaign.startDate || '',
            endDate: editableCampaign.endDate || '',
            category: editableCampaign.category || 'General',
            status: editableCampaign.status || 'Upcoming',
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
                targetAmount: campaign.targetAmount || 0,
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
                category: campaign.category || 'General',
                status: campaign.status || 'Upcoming',
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

        const donationsByStatus = donations.reduce((acc, d) => {
            const status = d.status || 'Pending';
            acc[status] = (acc[status] || 0) + d.amount;
            return acc;
        }, {} as Record<string, number>);

        const verifiedDonations = donationsByStatus['Verified'] || 0;
        const pendingDonations = donationsByStatus['Pending'] || 0;

        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + b.kitAmount, 0);
        
        const fundingGoal = campaign?.targetAmount || 0;
        const fundingProgress = fundingGoal > 0 ? (verifiedDonations / fundingGoal) * 100 : 0;
        const pendingProgress = fundingGoal > 0 ? (pendingDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            const status = b.status || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const beneficiaryChartData = Object.entries(beneficiaryStatusData).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const donationChartData = (() => {
            let filteredDonations = donations;
            if (donationChartFilter !== 'All') {
                filteredDonations = donations.filter(d => d.status === donationChartFilter);
            }
            
            const donationTypeData = filteredDonations.reduce((acc, d) => {
                    acc[d.type] = (acc[d.type] || 0) + d.amount;
                    return acc;
                }, {} as Record<string, number>);

            return Object.entries(donationTypeData).map(([name, value]) => ({ name, value }));
        })();

        return {
            verifiedDonations,
            pendingDonations,
            totalKitAmountRequired,
            fundingProgress,
            pendingProgress,
            beneficiaryChartData,
            donationChartData,
            totalBeneficiaries: beneficiaries.length,
            targetAmount: campaign.targetAmount,
            remainingToCollect: Math.max(0, (campaign.targetAmount || 0) - verifiedDonations),
        };
    }, [beneficiaries, donations, campaign, donationChartFilter]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading || isProfileLoading;
    
    const handleShare = async () => {
        if (!campaign || !summaryData) {
            toast({
                title: 'Error',
                description: 'Cannot share, summary data is not available.',
                variant: 'destructive',
            });
            return;
        }
        setIsSharing(true);

        const remainingToCollectText = summaryData.remainingToCollect > 0 
            ? `*Remaining to Collect: ₹${summaryData.remainingToCollect.toLocaleString()}*`
            : `*Goal Achieved! Thank you for your support!*`;

        const shareText = `
*Help Us Support the Community!*

*Campaign: ${campaign.name}*
${campaign.description || ''}

*Financial Summary:*
Target Amount: ₹${(summaryData.targetAmount || 0).toLocaleString()}
Verified Donations: ₹${summaryData.verifiedDonations.toLocaleString()}
${remainingToCollectText}

We are providing aid to *${summaryData.totalBeneficiaries} beneficiaries*.

Please donate and share this message. Every contribution helps!
        `.trim().replace(/^\s+/gm, '');


        const shareData = {
            title: `Campaign Summary: ${campaign.name}`,
            text: shareText,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Don't show toast if user cancels share dialog.
                if ((err as Error).name !== 'AbortError') {
                    console.log('Share failed, falling back to clipboard.', err);
                    try {
                        await navigator.clipboard.writeText(shareText);
                        toast({
                            title: 'Share Failed, Copied to Clipboard',
                            description: 'The summary has been copied to your clipboard.',
                            variant: 'success'
                        });
                    } catch (copyErr) {
                        toast({
                            title: 'Share and Copy Failed',
                            description: 'Could not share or copy the summary.',
                            variant: 'destructive',
                        });
                    }
                }
            } finally {
                setIsSharing(false);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                toast({
                    title: 'Copied to Clipboard',
                    description: 'Campaign summary has been copied successfully.',
                    variant: 'success'
                });
            } catch (err) {
                toast({
                    title: 'Copy Failed',
                    description: 'Could not copy summary to clipboard.',
                    variant: 'destructive',
                });
            } finally {
                setIsSharing(false);
            }
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
            <div className="min-h-screen bg-background text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8 text-center">
                    <p className="text-lg text-muted-foreground">Campaign not found.</p>
                    <Button asChild className="mt-4">
                        <Link href="/campaign">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Campaigns
                        </Link>
                    </Button>
                </main>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/campaign">
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
                                value={editableCampaign.name}
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
                            <Button onClick={handleShare} variant="outline" disabled={isSharing}>
                                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                Share
                            </Button>
                        )}
                        {canUpdate && (
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

                <div className="flex flex-wrap gap-2 border-b mb-4">
                    {canReadSummary && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                          <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
                      </Button>
                    )}
                    {canReadRation && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                          <Link href={`/campaign/${campaignId}`}>{campaign.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
                      </Button>
                    )}
                    {canReadBeneficiaries && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                          <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
                      </Button>
                    )}
                    {canReadDonations && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                          <Link href={`/campaign/${campaignId}/donations`}>Donations</Link>
                      </Button>
                    )}
                </div>

                <div className="space-y-6">
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
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="targetAmount" className="text-sm font-medium text-muted-foreground">Target Amount</Label>
                                    {editMode && canUpdate ? (
                                        <Input
                                            id="targetAmount"
                                            type="number"
                                            value={editableCampaign.targetAmount}
                                            onChange={(e) => setEditableCampaign(p => ({...p, targetAmount: e.target.value as any}))}
                                            className="mt-1"
                                            placeholder="e.g. 100000"
                                        />
                                    ) : (
                                        <p className="mt-1 text-lg font-semibold">₹{campaign.targetAmount?.toLocaleString() ?? '0.00'}</p>
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
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Verified Donations</CardTitle>
                                <Gift className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.verifiedDonations.toLocaleString() ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Donations</CardTitle>
                                <Hourglass className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.pendingDonations.toLocaleString() ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Required for Beneficiaries</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.totalKitAmountRequired.toLocaleString() ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Beneficiary Breakdown</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold mb-2">{summaryData?.totalBeneficiaries ?? 0} Total</div>
                                <div className="space-y-1 text-sm">
                                    {summaryData?.beneficiaryChartData.map((item) => (
                                        <div key={item.name} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--color-${item.name.replace(/\s+/g, '')})` }} />
                                                <span>{item.name}</span>
                                            </div>
                                            <span className="font-medium text-foreground">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="col-span-1 lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Funding Progress</CardTitle>
                                <CardDescription>
                                    ₹{summaryData?.verifiedDonations.toLocaleString() ?? 0} of ₹{(summaryData?.targetAmount ?? 0).toLocaleString()} funded from verified donations.
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
                                        Pending
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                <CardTitle>{donationChartFilter} Donations by Type</CardTitle>
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
                                            tickFormatter={(value) => `₹${Number(value).toLocaleString()}`}
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

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Beneficiary Status</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <ChartContainer
                                    config={beneficiaryStatusConfig}
                                    className="mx-auto aspect-square h-full"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={<ChartTooltipContent nameKey="name" />}
                                        />
                                        <Pie
                                            data={summaryData?.beneficiaryChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                        >
                                            {summaryData?.beneficiaryChartData.map((entry) => (
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
            </main>
        </div>
    );
}
