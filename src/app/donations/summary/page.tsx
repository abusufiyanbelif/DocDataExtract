

'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { collection } from 'firebase/firestore';
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

import type { Donation } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Wallet, CheckCircle, Hourglass, XCircle, Link as LinkIcon, Link2Off, Download } from 'lucide-react';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

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

const donationStatusChartConfig = {
    Verified: { label: "Verified", color: "hsl(var(--chart-2))" },
    Pending: { label: "Pending", color: "hsl(var(--chart-4))" },
    Canceled: { label: "Canceled", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export default function DonationsSummaryPage() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useSession();

    const donationsCollectionRef = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, 'donations');
    }, [firestore]);

    const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);
    const canRead = userProfile?.role === 'Admin' || !!userProfile?.permissions?.donations?.read;

    const summaryData = useMemo(() => {
        if (!donations) return null;

        const totalAmount = donations.reduce((acc, d) => acc + d.amount, 0);
        const verifiedAmount = donations.filter(d => d.status === 'Verified').reduce((acc, d) => acc + d.amount, 0);
        const pendingAmount = donations.filter(d => d.status === 'Pending').reduce((acc, d) => acc + d.amount, 0);
        const canceledAmount = donations.filter(d => d.status === 'Canceled').reduce((acc, d) => acc + d.amount, 0);
        
        const allocatedCount = donations.filter(d => d.campaignId).length;
        const unallocatedCount = donations.length - allocatedCount;

        const donationTypeData = donations.reduce((acc, d) => {
            const splits = d.typeSplit && d.typeSplit.length > 0
                ? d.typeSplit
                : (d.type ? [{ category: d.type, amount: d.amount }] : []);
            
            splits.forEach(split => {
                acc[split.category] = (acc[split.category] || 0) + split.amount;
            });
            return acc;
        }, {} as Record<string, number>);

        const paymentTypeData = donations.reduce((acc, d) => {
            const key = d.donationType?.replace(/\s+/g, '') || 'Other';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const statusData = donations.reduce((acc, d) => {
            acc[d.status] = (acc[d.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalAmount,
            verifiedAmount,
            pendingAmount,
            canceledAmount,
            allocatedCount,
            unallocatedCount,
            totalCount: donations.length,
            donationTypeChartData: Object.entries(donationTypeData).map(([name, value]) => ({ name, value })),
            donationPaymentTypeChartData: Object.entries(paymentTypeData).map(([name, value]) => ({ name, value })),
            donationStatusChartData: Object.entries(statusData).map(([name, value]) => ({ name, value })),
        };
    }, [donations]);
    
    const isLoading = areDonationsLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
     if (!canRead) {
        return (
            <div className="min-h-screen text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8">
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>
                            You do not have permission to view this page.
                        </AlertDescription>
                    </Alert>
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
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                <div className="border-b mb-4">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex w-max space-x-4">
                            <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                                <Link href="/donations">All Donations</Link>
                            </Button>
                            <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-primary text-primary shadow-none data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none" data-active="true">
                                <Link href="/donations/summary">Summary</Link>
                            </Button>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                
                <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Donation Amount</CardTitle>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.totalAmount.toLocaleString('en-IN') ?? '0.00'}</div>
                                <p className="text-xs text-muted-foreground">from {summaryData?.totalCount ?? 0} donations</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Verified Donations</CardTitle>
                                <CheckCircle className="h-4 w-4 text-success" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.verifiedAmount.toLocaleString('en-IN') ?? '0.00'}</div>
                                <p className="text-xs text-muted-foreground">from {summaryData?.donationStatusChartData?.find(d => d.name === 'Verified')?.value || 0} donations</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Donations</CardTitle>
                                <Hourglass className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.pendingAmount.toLocaleString('en-IN') ?? '0.00'}</div>
                                <p className="text-xs text-muted-foreground">from {summaryData?.donationStatusChartData?.find(d => d.name === 'Pending')?.value || 0} donations</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Canceled Donations</CardTitle>
                                <XCircle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rupee {summaryData?.canceledAmount.toLocaleString('en-IN') ?? '0.00'}</div>
                                <p className="text-xs text-muted-foreground">from {summaryData?.donationStatusChartData?.find(d => d.name === 'Canceled')?.value || 0} donations</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                         <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Donations by Status</CardTitle>
                                <CardDescription>Count of donations per status.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <ChartContainer
                                    config={donationStatusChartConfig}
                                    className="mx-auto aspect-square h-full"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={<ChartTooltipContent nameKey="name" />}
                                        />
                                        <Pie
                                            data={summaryData?.donationStatusChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            labelLine={false}
                                            label={({
                                              cx,
                                              cy,
                                              midAngle,
                                              innerRadius,
                                              outerRadius,
                                              value,
                                              index,
                                            }) => {
                                              const RADIAN = Math.PI / 180;
                                              const radius = 25 + innerRadius + (outerRadius - innerRadius);
                                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                              const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                              return (
                                                <text
                                                  x={x}
                                                  y={y}
                                                  fill="hsl(var(--foreground))"
                                                  textAnchor={x > cx ? "start" : "end"}
                                                  dominantBaseline="central"
                                                  className="text-xs"
                                                >
                                                  {summaryData?.donationStatusChartData?.[index].name} ({value})
                                                </text>
                                              );
                                            }}
                                        >
                                            {summaryData?.donationStatusChartData?.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                             <CardHeader>
                                <CardTitle>Donations by Category</CardTitle>
                                <CardDescription>Total amount collected per donation category.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={donationTypeChartConfig} className="h-[300px] w-full">
                                    <BarChart data={summaryData?.donationTypeChartData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickFormatter={(value) => `Rupee ${Number(value / 1000).toLocaleString()}k`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Bar
                                            dataKey="value"
                                            radius={4}
                                        >
                                             {summaryData?.donationTypeChartData?.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>

                     <div className="grid gap-6 lg:grid-cols-2">
                          <Card>
                            <CardHeader>
                                <CardTitle>Donations by Payment Type</CardTitle>
                                <CardDescription>Count of donations per payment method.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                <ChartContainer config={donationPaymentTypeChartConfig} className="h-[300px] w-full">
                                    <BarChart data={summaryData?.donationPaymentTypeChartData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <XAxis type="number" hide />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Bar
                                            dataKey="value"
                                            radius={4}
                                            layout="vertical"
                                        >
                                             {summaryData?.donationPaymentTypeChartData?.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name.replace(/\s+/g, '')})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Allocation Status</CardTitle>
                                <CardDescription>Number of donations linked to a campaign vs. unlinked.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center h-[300px] gap-4">
                                <div className="flex items-center gap-4 text-lg">
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="h-5 w-5 text-primary"/>
                                        <span className="font-bold text-2xl">{summaryData?.allocatedCount}</span>
                                        <span>Allocated</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link2Off className="h-5 w-5 text-muted-foreground"/>
                                        <span className="font-bold text-2xl">{summaryData?.unallocatedCount}</span>
                                        <span>Unallocated</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground text-center">Unallocated donations can be linked to any campaign from the main "All Donations" table.</p>
                            </CardContent>
                        </Card>
                     </div>
                </div>
            </main>
        </div>
    );
}
