
'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, DocumentReference } from 'firebase/firestore';
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
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Target, Users, Gift, LogIn, Wallet, Share2, Hourglass } from 'lucide-react';
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

export default function PublicCampaignSummaryPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as string;
    const firestore = useFirestore();
    const { toast } = useToast();

    const [donationChartFilter, setDonationChartFilter] = useState<'All' | 'Verified' | 'Pending' | 'Canceled'>('All');
    
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareDialogData, setShareDialogData] = useState({ title: '', text: '', url: '' });

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
            targetAmount: totalKitAmountRequired,
            remainingToCollect: Math.max(0, totalKitAmountRequired - verifiedNonZakatDonations),
        };
    }, [beneficiaries, donations, campaign, donationChartFilter]);
    
    const isLoading = isCampaignLoading || areBeneficiariesLoading || areDonationsLoading;
    
    const handleShare = async () => {
        if (!campaign || !summaryData) {
            toast({
                title: 'Error',
                description: 'Cannot share, summary data is not available.',
                variant: 'destructive',
            });
            return;
        }

        const remainingToCollectText = summaryData.remainingToCollect > 0 
            ? `*Remaining for Kits: Rupee ${summaryData.remainingToCollect.toLocaleString('en-IN')}*`
            : `*Kit funding goal achieved! Thank you!*`;

        const categoryBreakdownText = summaryData.beneficiaryCategoryBreakdown.length > 0 
            ? `\n*Beneficiary Breakdown:*\n${summaryData.beneficiaryCategoryBreakdown.map(item => `${item.name}: ${item.count} ${item.count === 1 ? 'beneficiary' : 'beneficiaries'} (Rupee ${item.totalAmount.toLocaleString('en-IN')})`).join('\n')}`
            : '';

        const shareText = `
*Help Us Support the Community!*

*Campaign: ${campaign.name}*
${campaign.description || ''}

*Financial Summary:*
Target for Kits: Rupee ${(summaryData.targetAmount || 0).toLocaleString('en-IN')}
Funds for Kits (Verified): Rupee ${summaryData.verifiedNonZakatDonations.toLocaleString('en-IN')}
Zakat Collected (Verified): Rupee ${summaryData.zakatCollected.toLocaleString('en-IN')}
${remainingToCollectText}

We are providing aid to *${summaryData.totalBeneficiaries} beneficiaries* in total.${categoryBreakdownText}

Please donate and share this message. Every contribution helps!
        `.trim().replace(/^\s+/gm, '');


        const dataToShare = {
            title: `Campaign Summary: ${campaign.name}`,
            text: shareText,
            url: window.location.href,
        };
        
        setShareDialogData(dataToShare);
        setIsShareDialogOpen(true);
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
                        <Link href="/campaign-public">
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

                <div className="space-y-6">
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
                                <CardTitle className="text-sm font-medium">Kit Funding (Verified)</CardTitle>
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
                                <CardTitle className="text-sm font-medium">Pending Donations Verification</CardTitle>
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
                                                <p className="font-mono text-right text-foreground">Rupee {item.totalAmount.toLocaleString('en-IN')}</p>
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
