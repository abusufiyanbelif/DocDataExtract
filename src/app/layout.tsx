
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { SessionProvider } from '@/components/session-provider';
import { PT_Sans, Source_Code_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';
import { adminDb } from '@/lib/firebase-admin-sdk';
import type { BrandingSettings } from '@/lib/types';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-code',
});

export const metadata: Metadata = {
  title: 'Welcome to Baitulmal Samajik Sanstha Solapur',
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
  const watermarkStyle = logoUrl ? { backgroundImage: `url(${logoUrl})` } : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* The watermark is a fixed overlay that sits on its own layer. */}
        <div className="global-watermark" style={watermarkStyle} />
        
        {/* All application content is rendered inside the app-root. */}
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
