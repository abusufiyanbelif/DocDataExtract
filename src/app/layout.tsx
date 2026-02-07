
import type { Metadata } from 'next';
import './globals.css';
import * as React from 'react';
import { Providers } from './providers';
import { adminDb } from '@/lib/firebase-admin-sdk';
import type { BrandingSettings } from '@/lib/types';

// This function fetches branding settings on the server to generate dynamic metadata.
async function getBrandingSettings(): Promise<BrandingSettings | null> {
    // If the admin SDK isn't initialized (e.g., service key missing), we can't fetch data.
    if (!adminDb) {
        console.warn('Admin DB not initialized during build; cannot fetch dynamic metadata.');
        return null;
    }
    try {
        const docSnap = await adminDb.collection('settings').doc('branding').get();
        if (docSnap.exists) {
            return docSnap.data() as BrandingSettings;
        }
        return null;
    } catch (error) {
        // Log errors but don't block the build.
        console.error("Failed to fetch branding settings for metadata:", error);
        return null;
    }
}

// generateMetadata allows us to create dynamic metadata for the page <head>.
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const iconUrl = branding?.logoUrl;
  const siteName = branding?.name || 'Baitulmal Samajik Sanstha Solapur';

  return {
    title: {
      template: `%s | ${siteName}`,
      default: `Welcome to ${siteName}`,
    },
    description: 'Managing and tracking community support campaigns efficiently.',
    icons: {
      // Use the dynamic logo URL as the icon, with a fallback.
      icon: iconUrl || '/favicon.ico',
    },
  };
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
