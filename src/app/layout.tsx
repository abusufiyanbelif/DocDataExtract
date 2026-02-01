
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { SessionProvider } from '@/components/session-provider';
import { PT_Sans, Source_Code_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { adminDb } from '@/lib/firebase-admin-sdk';

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
  icons: null,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  let logoUrl: string | null = null;
  if (adminDb) {
      try {
          const brandingSnap = await adminDb.doc('settings/branding').get();
          if (brandingSnap.exists) {
              logoUrl = brandingSnap.data()?.logoUrl || null;
          }
      } catch (error) {
          console.error("Could not fetch branding settings for layout watermark:", error);
      }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", ptSans.variable, sourceCodePro.variable)}>
        {logoUrl && (
            <div className="fixed inset-0 z-[-10] opacity-5 pointer-events-none flex items-center justify-center p-8">
                <Image
                    src={logoUrl}
                    alt="Watermark"
                    width={500}
                    height={500}
                    className="object-contain"
                />
            </div>
        )}
        <FirebaseClientProvider>
            <SessionProvider>
                {children}
            </SessionProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
