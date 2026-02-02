'use client';
import { useMemo } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, DocumentReference } from 'firebase/firestore';
import type { PaymentSettings } from '@/lib/types';
import Image from 'next/image';
import { Copy, Smartphone, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { usePaymentSettings } from '@/hooks/use-payment-settings';

export function AppFooter() {
  const { paymentSettings, isLoading } = usePaymentSettings();
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied to clipboard!', description: text, duration: 3000 });
    });
  };

  if (isLoading) {
    return (
      <footer className="bg-card border-t mt-auto p-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex justify-center md:justify-end">
            <Skeleton className="h-32 w-32" />
          </div>
        </div>
      </footer>
    );
  }

  if (!paymentSettings || (!paymentSettings.upiId && !paymentSettings.paymentMobileNumber && !paymentSettings.qrCodeUrl)) {
    return null; // Don't render footer if no settings are found
  }

  return (
    <footer className="bg-card border-t mt-auto p-6 text-card-foreground">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
        <div className="flex flex-col items-center md:items-start gap-2">
          {paymentSettings.upiId && (
            <div className="flex flex-col items-center md:items-start">
              <h3 className="font-semibold flex items-center gap-2"><QrCode /> UPI ID</h3>
              <div className="flex items-center gap-2">
                <p className="font-mono">{paymentSettings.upiId}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(paymentSettings.upiId!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          {paymentSettings.paymentMobileNumber && (
            <div className="flex flex-col items-center">
              <h3 className="font-semibold flex items-center gap-2"><Smartphone /> Mobile Number</h3>
              <div className="flex items-center gap-2">
                <p className="font-mono">{paymentSettings.paymentMobileNumber}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(paymentSettings.paymentMobileNumber!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-center md:justify-end">
          {paymentSettings.qrCodeUrl && (
            <div className="relative h-32 w-32 border-4 border-primary rounded-lg overflow-hidden p-1 bg-white">
              <Image src={paymentSettings.qrCodeUrl} alt="UPI QR Code" fill className="object-contain" />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
