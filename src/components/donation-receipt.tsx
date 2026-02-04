

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Donation, Campaign, BrandingSettings, PaymentSettings } from '@/lib/types';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';

interface DonationReceiptProps {
  donation: Donation;
  campaign: Campaign;
  brandingSettings: BrandingSettings | null;
  paymentSettings: PaymentSettings | null;
}

const ReceiptRow = ({ label, value, isMono = false }: { label: string; value: React.ReactNode, isMono?: boolean }) => (
    <div className="flex justify-between items-start">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium text-right ${isMono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);

export const DonationReceipt = React.forwardRef<HTMLDivElement, DonationReceiptProps>(
  ({ donation, campaign, brandingSettings, paymentSettings }, ref) => {
    
    const validLogoUrl = brandingSettings?.logoUrl?.trim() ? brandingSettings.logoUrl : null;
    const proxiedLogoUrl = validLogoUrl ? `/api/image-proxy?url=${encodeURIComponent(validLogoUrl)}` : null;

    const validQrCodeUrl = paymentSettings?.qrCodeUrl?.trim() ? paymentSettings.qrCodeUrl : null;
    const proxiedQrCodeUrl = validQrCodeUrl ? `/api/image-proxy?url=${encodeURIComponent(validQrCodeUrl)}` : null;
    
    const typeSplit = donation.typeSplit && donation.typeSplit.length > 0
      ? donation.typeSplit
      : (donation.type ? [{ category: donation.type, amount: donation.amount }] : []);


    return (
        <div ref={ref} className="bg-background p-4 sm:p-8 rounded-lg">
            <Card className="w-full max-w-2xl mx-auto shadow-none border-border relative overflow-hidden">
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
                <div className="relative">
                    <CardHeader className="text-center space-y-4">
                        {proxiedLogoUrl && (
                             <img
                                src={proxiedLogoUrl}
                                alt="Logo"
                                className="mx-auto object-contain"
                                style={{ 
                                    width: brandingSettings?.logoWidth ? `${brandingSettings.logoWidth}px` : '100px',
                                    height: brandingSettings?.logoHeight ? `${brandingSettings.logoHeight}px` : '48px'
                                 }}
                              />
                        )}
                        <CardTitle className="text-2xl">Donation Receipt</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <ReceiptRow label="Donation ID" value={donation.id} isMono />
                            <ReceiptRow label="Campaign ID" value={campaign.id} isMono />
                            <ReceiptRow label="Campaign" value={campaign.name} />
                            <ReceiptRow label="Date" value={donation.donationDate} />
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <h3 className="font-semibold">Donor Details</h3>
                            <ReceiptRow label="Name" value={donation.donorName} />
                            {donation.donorPhone && <ReceiptRow label="Phone" value={donation.donorPhone} isMono />}
                        </div>
                        <Separator />
                        <div className="space-y-3">
                             <h3 className="font-semibold">Transaction Details</h3>
                            <ReceiptRow label="Receiver Name" value={donation.receiverName} />
                            <ReceiptRow label="Total Amount" value={`Rupee ${donation.amount.toFixed(2)}`} isMono />
                            <ReceiptRow label="Payment Type" value={<Badge variant="outline">{donation.donationType}</Badge>} />
                            {donation.transactionId && <ReceiptRow label="Transaction ID" value={donation.transactionId} isMono />}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Category Breakdown</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {typeSplit.map((split) => (
                                        <TableRow key={split.category}>
                                            <TableCell>{split.category}</TableCell>
                                            <TableCell className="text-right font-mono">Rupee {split.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {(donation.comments || donation.suggestions) && (
                            <>
                                <Separator />
                                <div className="space-y-3 text-sm">
                                    <h3 className="font-semibold">Additional Notes</h3>
                                    {donation.comments && <p><strong>Comments:</strong> {donation.comments}</p>}
                                    {donation.suggestions && <p><strong>Suggestions:</strong> {donation.suggestions}</p>}
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-start text-xs text-muted-foreground p-6 pt-4 space-y-2">
                        <Separator className="mb-4" />
                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="space-y-1 text-left">
                                {paymentSettings?.regNo && <p>Reg. No.: {paymentSettings.regNo}</p>}
                                {paymentSettings?.pan && <p>PAN: {paymentSettings.pan}</p>}
                                {paymentSettings?.contactEmail && <p>Email: {paymentSettings.contactEmail}</p>}
                                {paymentSettings?.contactPhone && <p>Phone: {paymentSettings.contactPhone}</p>}
                            </div>
                             <div className="space-y-1 text-right">
                                {paymentSettings?.address && <p className="whitespace-pre-line">{paymentSettings.address}</p>}
                                {paymentSettings?.upiId && <p>UPI: {paymentSettings.upiId}</p>}
                            </div>
                        </div>
                        {proxiedQrCodeUrl && (
                            <div className="w-full flex justify-center pt-4">
                                <img
                                    src={proxiedQrCodeUrl}
                                    alt="QR Code"
                                    width={80}
                                    height={80}
                                />
                            </div>
                        )}
                        <p className="pt-2 text-center w-full">This is a computer-generated receipt and does not require a signature.</p>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
  }
);
DonationReceipt.displayName = 'DonationReceipt';
