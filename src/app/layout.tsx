
import type { Metadata } from 'next';
import './globals.css';
import * as React from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseContentWrapper } from '@/components/FirebaseContentWrapper';

export const metadata: Metadata = {
  title: {
    template: '%s | Baitulmal Samajik Sanstha Solapur',
    default: 'Welcome to Baitulmal Samajik Sanstha Solapur',
  },
  description: 'Managing and tracking community support campaigns efficiently.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FirebaseClientProvider>
          <AuthProvider>
            <FirebaseContentWrapper>
              <div className="app-root">
                {children}
                <AppFooter />
              </div>
              <Toaster />
            </FirebaseContentWrapper>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
