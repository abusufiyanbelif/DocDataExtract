
import type { Metadata } from 'next';
import './globals.css';
import * as React from 'react';

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
        {children}
      </body>
    </html>
  );
}
