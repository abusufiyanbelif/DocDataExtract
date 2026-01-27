'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, collection, updateDoc, query, where } from 'firebase/firestore';
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
import { ArrowLeft, Loader2, Target, Users, Gift, Edit, Save, HandCoins } from 'lucide-react';
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


const donationChartConfig = {
    value: {
        label: "Donations",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

const beneficiaryStatusConfig = {
    Given: { label: "Given", color: "hsl(var(--chart-1))" },
    Pending: { label: "Pending", color: "hsl(var(--chart-2))" },
    Hold: { label: "Hold", color: "hsl(var(--chart-3))" },
    "NeedMoreDetails": { label: "Need More Details", color: "hsl(var(--chart-4))" },
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

    // Data fetching
    const campaignDocRef = useMemo(() => firestore ? doc(firestore, 'campaigns', campaignId) : null, [firestore, campaignId]);
    const beneficiariesCollectionRef = useMemo(() => firestore ? collection(firestore, `campaigns/${campaignId}/beneficiaries`) : null, [firestore, campaignId]);
    const donationsCollectionRef = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId]);

    const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
    const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);
    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    
    // Populate form fields when campaign data loads
    useEffect(() => {
        if (campaign) {
            setEditableCampaign({
                description: campaign.description || '',
                targetAmount: campaign.targetAmount || 0,
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
            });
        }
    }, [campaign]);
    
    const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
    const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
    const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
    const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;
    const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.update;

    const handleSave = () => {
        if (!campaignDocRef || !userProfile || !canUpdate) return;
        
        const saveData = {
            description: editableCampaign.description || '',
            targetAmount: Number(editableCampaign.targetAmount) || 0,
            startDate: editableCampaign.startDate || '',
            endDate: editableCampaign.endDate || '',
        };

        updateDoc(campaignDocRef, saveData)
            .then(() => {
                toast({ title: 'Success', description: 'Campaign summary updated.' });
                setEditMode(false);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: campaignDocRef.path,
                    operation: 'update',
                    requestResourceData: saveData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleCancel = () => {
        if (campaign) {
            setEditableCampaign({
                description: campaign.description || '',
                targetAmount: campaign.targetAmount || 0,
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || '',
            });
        }
        setEditMode(false);
    };

    // Memoized calculations
    const summaryData = useMemo(() => {
        if (!beneficiaries || !donations || !campaign) return null;

        const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + b.kitAmount, 0);
        
        const fundingGoal = campaign?.targetAmount || 0;
        const fundingProgress = fundingGoal > 0 ? (totalDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            const statusKey = b.status.replace(/\s+/g, '');
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const beneficiaryChartData = Object.entries(beneficiaryStatusData).map(([name, value]) => ({ name, value }));

        const donationTypeData = donations.reduce((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + d.amount;
            return acc;
        }, {} as Record<string, number>);

        const donationChartData = Object.entries(donationTypeData).map(([name, value]) => ({ name, value }));

        return {
            totalDonations,
            totalKitAmountRequired,
            fundingProgress,
            beneficiaryChartData,
            donationChartData,
            totalBeneficiaries: beneficiaries.length,
            targetAmount: campaign.targetAmount,
            remainingToCollect: Math.max(0, (campaign.targetAmount || 0) - totalDonations),
        };
    }, [beneficiaries, donations, campaign]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading || isProfileLoading;

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
                    <h1 className="text-3xl font-bold">{campaign.name}</h1>
                    {canUpdate && (
                        !editMode ? (
                            <Button onClick={() => setEditMode(true)}>
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

                <div className="flex flex-wrap gap-2 border-b mb-4">
                    {canReadSummary && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                          <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
                      </Button>
                    )}
                    {canReadRation && (
                      <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                          <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
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
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Donations Received</CardTitle>
                                <Gift className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.totalDonations.toLocaleString() ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Remaining to Collect</CardTitle>
                                <HandCoins className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.remainingToCollect.toLocaleString() ?? '0.00'}</div>
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
                                <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summaryData?.totalBeneficiaries ?? 0}</div>
                            </CardContent>
                        </Card>
                        
                        <Card className="col-span-1 lg:col-span-4">
                            <CardHeader>
                                <CardTitle>Funding Progress (Based on Target Amount)</CardTitle>
                                <CardDescription>
                                    {summaryData?.fundingProgress.toFixed(2)}% of ₹{(summaryData?.targetAmount ?? 0).toLocaleString()} funded
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Progress value={summaryData?.fundingProgress} />
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Donations by Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={donationChartConfig} className="h-[300px] w-full">
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
                                            fill="var(--color-value)"
                                            radius={4}
                                        />
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
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
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
