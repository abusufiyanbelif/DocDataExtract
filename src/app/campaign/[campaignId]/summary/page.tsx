'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, collection, updateDoc } from 'firebase/firestore';
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import type { Campaign, Beneficiary, Donation } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, IndianRupee, Target, Users, Gift, Edit, Save } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function CampaignSummaryPage() {
    const params = useParams();
    const campaignId = params.campaignId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    // State for edit mode and form fields
    const [editMode, setEditMode] = useState(false);
    const [editableDescription, setEditableDescription] = useState('');
    const [editableTargetAmount, setEditableTargetAmount] = useState<number | string>('');

    // Data fetching
    const campaignDocRef = useMemo(() => firestore ? doc(firestore, 'campaigns', campaignId) : null, [firestore, campaignId]);
    const beneficiariesCollectionRef = useMemo(() => firestore ? collection(firestore, `campaigns/${campaignId}/beneficiaries`) : null, [firestore, campaignId]);
    const donationsCollectionRef = useMemo(() => firestore ? collection(firestore, `campaigns/${campaignId}/donations`) : null, [firestore, campaignId]);

    const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
    const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);
    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    
    // Populate form fields when campaign data loads
    useEffect(() => {
        if (campaign) {
            setEditableDescription(campaign.description || '');
            setEditableTargetAmount(campaign.targetAmount || '');
        }
    }, [campaign]);

    const handleSave = async () => {
        if (!campaignDocRef || !userProfile || userProfile.role !== 'Admin') return;
        try {
            await updateDoc(campaignDocRef, {
                description: editableDescription,
                targetAmount: Number(editableTargetAmount) || 0,
            });
            toast({ title: 'Success', description: 'Campaign summary updated.' });
            setEditMode(false);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to update summary.', variant: 'destructive' });
        }
    };

    const handleCancel = () => {
        if (campaign) {
            setEditableDescription(campaign.description || '');
            setEditableTargetAmount(campaign.targetAmount || 0);
        }
        setEditMode(false);
    };

    // Memoized calculations
    const summaryData = useMemo(() => {
        if (!beneficiaries || !donations) return null;

        const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
        const totalKitAmountRequired = beneficiaries.reduce((sum, b) => sum + b.kitAmount, 0);
        
        const fundingGoal = campaign?.targetAmount || totalKitAmountRequired;
        const fundingProgress = fundingGoal > 0 ? (totalDonations / fundingGoal) * 100 : 0;

        const beneficiaryStatusData = beneficiaries.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
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
            targetAmount: campaign?.targetAmount,
        };
    }, [beneficiaries, donations, campaign]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading || isProfileLoading;
    const isAdmin = userProfile?.role === 'Admin';

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
                    {isAdmin && (
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
                    <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                        <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
                    </Button>
                    <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                        <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
                    </Button>
                    <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                        <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
                    </Button>
                    <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                        <Link href={`/campaign/${campaignId}/donations`}>Donations</Link>
                    </Button>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Description</label>
                                {editMode ? (
                                    <Textarea
                                        value={editableDescription}
                                        onChange={(e) => setEditableDescription(e.target.value)}
                                        className="mt-1"
                                        rows={4}
                                    />
                                ) : (
                                    <p className="mt-1 text-sm">{campaign.description || 'No description provided.'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Target Amount</label>
                                {editMode ? (
                                    <Input
                                        type="number"
                                        value={editableTargetAmount}
                                        onChange={(e) => setEditableTargetAmount(e.target.value)}
                                        className="mt-1"
                                        placeholder="e.g. 100000"
                                    />
                                ) : (
                                    <p className="mt-1 text-lg font-semibold">₹{summaryData?.targetAmount?.toFixed(2) ?? '0.00'}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Donations Received</CardTitle>
                                <Gift className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.totalDonations.toFixed(2) ?? '0.00'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Required for Beneficiaries</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{summaryData?.totalKitAmountRequired.toFixed(2) ?? '0.00'}</div>
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
                        
                        <Card className="col-span-1 lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Funding Progress (Based on Target Amount)</CardTitle>
                                <CardDescription>
                                    {summaryData?.fundingProgress.toFixed(2)}% of ₹{summaryData?.targetAmount?.toFixed(2) ?? '0.00'} funded
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
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={summaryData?.donationChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="value" name="Amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Beneficiary Status</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={summaryData?.beneficiaryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {summaryData?.beneficiaryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent nameKey="name" />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
