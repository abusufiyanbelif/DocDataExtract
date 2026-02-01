
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { SessionProvider } from '@/components/session-provider';
import { adminDb } from '@/lib/firebase-admin-sdk';
import type { BrandingSettings } from '@/lib/types';
import * as React from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s | Baitulmal Samajik Sanstha Solapur',
    default: 'Welcome to Baitulmal Samajik Sanstha Solapur',
  },
  description: 'Managing and tracking community support campaigns efficiently.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  let logoUrl: string | null = null;
  try {
    if (adminDb) {
      const brandingSnap = await adminDb.collection('settings').doc('branding').get();
      if (brandingSnap.exists) {
        logoUrl = (brandingSnap.data() as BrandingSettings)?.logoUrl || null;
      }
    }
  } catch (error) {
    console.error("Failed to fetch branding settings on server:", error);
  }
  const watermarkStyle = logoUrl ? { '--watermark-url': `url(${logoUrl})` } as React.CSSProperties : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <body style={watermarkStyle}>
        <div className="app-root">
          <FirebaseClientProvider>
              <SessionProvider>
                  {children}
              </SessionProvider>
          </FirebaseClientProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
