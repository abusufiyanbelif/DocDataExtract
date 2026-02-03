'use client';
import { useMemo } from 'react';
import Image from 'next/image';
import { Copy, Smartphone, QrCode, Mail, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { usePaymentSettings } from '@/hooks/use-payment-settings';

export function DownloadFooter() {
  const { paymentSettings, isLoading } = usePaymentSettings();
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${type} Copied!`, description: text, duration: 3000 });
    });
  };

  if (isLoading) {
    return (
      <footer className="bg-card border-t mt-auto p-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-center md:justify-end">
            <Skeleton className="h-32 w-32" />
          </div>
        </div>
      </footer>
    );
  }

  const hasPaymentInfo = paymentSettings?.upiId || paymentSettings?.paymentMobileNumber || paymentSettings?.qrCodeUrl;
  const hasContactInfo = paymentSettings?.contactEmail || paymentSettings?.contactPhone;

  if (!hasPaymentInfo && !hasContactInfo) {
    return null; // Don't render footer if no settings are found
  }

  return (
    <footer className="bg-card border-t mt-6 p-6 text-card-foreground">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Contact Info */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <h3 className="font-semibold text-lg">Contact Us</h3>
          {paymentSettings?.contactEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <span>{paymentSettings.contactEmail}</span>
            </div>
          )}
          {paymentSettings?.contactPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4" />
              <span>{paymentSettings.contactPhone}</span>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="flex flex-col items-center gap-3">
          <h3 className="font-semibold text-lg">For Donations</h3>
          {paymentSettings?.upiId && (
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <p className="font-mono text-sm">{paymentSettings.upiId}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(paymentSettings!.upiId!, 'UPI ID')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          {paymentSettings?.paymentMobileNumber && (
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <p className="font-mono text-sm">{paymentSettings.paymentMobileNumber}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(paymentSettings!.paymentMobileNumber!, 'Phone Number')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="flex justify-center md:justify-end">
          {paymentSettings?.qrCodeUrl && (
            <div className="relative h-32 w-32 border-4 border-primary rounded-lg overflow-hidden p-1 bg-white">
              <Image src={paymentSettings.qrCodeUrl} alt="UPI QR Code" fill className="object-contain" />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
