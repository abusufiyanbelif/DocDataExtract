

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Donation, Campaign, Lead } from '@/lib/types';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';

interface DonationReceiptProps {
  donation: Donation;
  campaign: Campaign | Lead;
}

const ReceiptRow = ({ label, value, isMono = false }: { label: string; value: React.ReactNode, isMono?: boolean }) => (
    <div className="flex justify-between items-baseline gap-4 py-1">
        <p className="text-sm text-muted-foreground whitespace-nowrap">{label}</p>
        <p className={`text-xl font-semibold text-right ${isMono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);

export const DonationReceipt = React.forwardRef<HTMLDivElement, DonationReceiptProps>(
  ({ donation, campaign }, ref) => {
    
    const typeSplit = donation.typeSplit && donation.typeSplit.length > 0
      ? donation.typeSplit
      : (donation.type ? [{ category: donation.type, amount: donation.amount }] : []);


    return (
        <div ref={ref} className="bg-background p-4 sm:p-8 rounded-lg">
            <Card className="w-full max-w-md mx-auto shadow-none border-border relative overflow-hidden">
                <div className="relative">
                    <CardHeader className="text-center space-y-4">
                        <CardTitle className="text-3xl font-bold">Donation Receipt</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <ReceiptRow label="Donation ID" value={donation.id} isMono />
                            <ReceiptRow label="Campaign/Lead ID" value={campaign.id} isMono />
                            <ReceiptRow label="Campaign/Lead" value={campaign.name} />
                            <ReceiptRow label="Date" value={donation.donationDate} />
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl">Donor Details</h3>
                            <ReceiptRow label="Name" value={donation.donorName} />
                            {donation.donorPhone && <ReceiptRow label="Phone" value={donation.donorPhone} isMono />}
                        </div>
                        <Separator />
                        <div className="space-y-4">
                             <h3 className="font-bold text-xl">Transaction Details</h3>
                            <ReceiptRow label="Receiver Name" value={donation.receiverName} />
                            <ReceiptRow label="Total Amount" value={`₹${donation.amount.toFixed(2)}`} isMono />
                            <ReceiptRow label="Payment Type" value={<Badge variant="outline">{donation.donationType}</Badge>} />
                            {donation.transactionId && <ReceiptRow label="Transaction ID" value={donation.transactionId} isMono />}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="font-bold text-xl">Category Breakdown</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-sm">Category</TableHead>
                                        <TableHead className="text-right text-sm">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {typeSplit.map((split) => (
                                        <TableRow key={split.category}>
                                            <TableCell className="py-1">{split.category}</TableCell>
                                            <TableCell className="py-1 text-right font-mono">₹{split.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {(donation.comments || donation.suggestions) && (
                            <>
                                <Separator />
                                <div className="space-y-3 text-sm">
                                    <h3 className="font-bold text-lg">Additional Notes</h3>
                                    {donation.comments && <p><strong>Comments:</strong> {donation.comments}</p>}
                                    {donation.suggestions && <p><strong>Suggestions:</strong> {donation.suggestions}</p>}
                                </div>
                            </>
                        )}
                         <Separator />
                         <p className="pt-2 text-center w-full text-xs text-muted-foreground">This is a computer-generated receipt and does not require a signature.</p>
                    </CardContent>
                    <CardFooter className="flex-col items-center justify-center text-center p-4 bg-muted/50">
                        <p className="font-semibold text-primary text-lg">JazakAllah Khair!</p>
                        <p className="text-sm text-muted-foreground">May Allah accept your donation and bless you abundantly.</p>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
  }
);
DonationReceipt.displayName = 'DonationReceipt';
