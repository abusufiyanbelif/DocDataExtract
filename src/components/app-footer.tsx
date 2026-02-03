
'use client';
import { useMemo } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Copy, Smartphone, QrCode, Mail, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import { useBranding } from '@/hooks/use-branding';
import { Separator } from './ui/separator';

export function AppFooter() {
  const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();
  const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
  const { toast } = useToast();
  const pathname = usePathname();

  const isSummaryPage = pathname.includes('/summary');
  const isLoading = isPaymentLoading || isBrandingLoading;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${type} Copied!`, description: text, duration: 3000 });
    });
  };

  if (isSummaryPage) {
    return null;
  }
  
  const hasPaymentInfo = paymentSettings?.upiId || paymentSettings?.paymentMobileNumber || paymentSettings?.qrCodeUrl;
  const hasContactInfo = paymentSettings?.contactEmail || paymentSettings?.contactPhone;
  const hasOrgInfo = paymentSettings?.regNo || paymentSettings?.pan || paymentSettings?.address;

  if (!isLoading && !hasPaymentInfo && !hasContactInfo && !hasOrgInfo) {
    return null; // Don't render footer if no settings are found and not loading
  }

  return (
    <footer className="bg-card border-t mt-auto p-6 text-card-foreground">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Org & Contact Info */}
        <div className="flex flex-col items-center md:items-start gap-3">
          {isLoading ? <Skeleton className="h-7 w-2/3" /> : <h3 className="font-semibold text-lg">{brandingSettings?.name || 'Baitulmal Samajik Sanstha Solapur'}</h3>}
          {isLoading ? <Skeleton className="h-4 w-full" /> : paymentSettings?.address && <p className="text-sm text-muted-foreground">{paymentSettings.address}</p>}
           <div className="text-sm text-muted-foreground space-y-1">
                {isLoading ? <Skeleton className="h-4 w-3/4" /> : paymentSettings?.regNo && <p>Reg. No.: {paymentSettings.regNo}</p>}
                {isLoading ? <Skeleton className="h-4 w-1/2" /> : paymentSettings?.pan && <p>PAN: {paymentSettings.pan}</p>}
            </div>
             <Separator className="my-2"/>
          {isLoading ? <Skeleton className="h-5 w-4/5" /> : paymentSettings?.contactEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <span>{paymentSettings.contactEmail}</span>
            </div>
          )}
          {isLoading ? <Skeleton className="h-5 w-3/5" /> : paymentSettings?.contactPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4" />
              <span>{paymentSettings.contactPhone}</span>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="flex flex-col items-center gap-3">
            {isLoading ? <Skeleton className="h-7 w-1/2" /> : <h3 className="font-semibold text-lg">For Donations</h3>}
            {isLoading ? <Skeleton className="h-5 w-4/5" /> : paymentSettings?.upiId && (
                <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                <p className="font-mono text-sm">{paymentSettings.upiId}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(paymentSettings!.upiId!, 'UPI ID')}>
                    <Copy className="h-4 w-4" />
                </Button>
                </div>
            )}
            {isLoading ? <Skeleton className="h-5 w-3/5" /> : paymentSettings?.paymentMobileNumber && (
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
          {isLoading ? (
            <Skeleton className="h-32 w-32 rounded-lg" />
          ) : (
            paymentSettings && paymentSettings.qrCodeUrl && (
                <img 
                    src={paymentSettings.qrCodeUrl}
                    alt="UPI QR Code"
                    width={paymentSettings.qrWidth || 128}
                    height={paymentSettings.qrHeight || 128}
                    className="object-contain border-4 border-primary rounded-lg p-1 bg-white"
                />
            )
          )}
        </div>
      </div>
    </footer>
  );
}
