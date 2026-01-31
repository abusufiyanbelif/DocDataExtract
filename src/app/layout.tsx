import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/auth-provider';
import { PT_Sans, Source_Code_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';
import "@/ai/genkit";

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
  title: 'Welcome to DocDataExtract AB',
  description: 'Scan images and documents to extract text and structured data.',
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", ptSans.variable, sourceCodePro.variable)}>
        <FirebaseClientProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
