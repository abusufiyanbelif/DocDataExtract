
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { SessionProvider } from '@/components/session-provider';
import { PT_Sans, Source_Code_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Watermark } from '@/components/watermark';

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", ptSans.variable, sourceCodePro.variable)}>
        <FirebaseClientProvider>
            <SessionProvider>
                <Watermark />
                {children}
            </SessionProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
