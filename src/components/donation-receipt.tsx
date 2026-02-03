
'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Donation, Campaign, BrandingSettings, PaymentSettings } from '@/lib/types';

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
    return (
        <div ref={ref} className="bg-background p-4 sm:p-8 rounded-lg">
            <Card className="w-full max-w-2xl mx-auto shadow-none border-border relative overflow-hidden">
                 {brandingSettings?.logoUrl && (
                    <div
                        className="absolute inset-0 bg-no-repeat bg-center opacity-5 pointer-events-none"
                        style={{
                            backgroundImage: `url(${brandingSettings.logoUrl})`,
                            backgroundSize: '75%',
                        }}
                    ></div>
                )}
                <div className="relative">
                    <CardHeader className="text-center space-y-4">
                        {brandingSettings?.logoUrl && (
                             <img src={brandingSettings.logoUrl} crossOrigin="anonymous" alt="Logo" className="mx-auto" style={{ width: `${brandingSettings.logoWidth || 100}px`, height: 'auto' }}/>
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
                            <ReceiptRow label="Amount" value={`Rupee ${donation.amount.toFixed(2)}`} isMono />
                             <ReceiptRow label="Category" value={<Badge variant="secondary">{donation.type}</Badge>} />
                            <ReceiptRow label="Payment Type" value={<Badge variant="outline">{donation.donationType}</Badge>} />
                            {donation.transactionId && <ReceiptRow label="Transaction ID" value={donation.transactionId} isMono />}
                        </div>
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
                        {paymentSettings?.qrCodeUrl && (
                            <div className="w-full flex justify-center pt-4">
                                <img src={paymentSettings.qrCodeUrl} crossOrigin="anonymous" alt="QR Code" style={{ width: '80px', height: '80px' }} />
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
