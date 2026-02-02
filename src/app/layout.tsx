
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from '@/components/session-provider';
import { AuthProvider } from '@/components/auth-provider';
import * as React from 'react';
import { AppFooter } from '@/components/app-footer';

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
        <SessionProvider>
           <AuthProvider>
              <div className="app-root">
                {children}
                <AppFooter />
              </div>
              <Toaster />
            </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
