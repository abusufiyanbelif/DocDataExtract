
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseContentWrapper } from '@/components/FirebaseContentWrapper';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { useBranding } from '@/hooks/use-branding';
import { TempLogo } from '@/components/temp-logo';

function Watermark() {
    const { brandingSettings, isLoading } = useBranding();

    if (isLoading) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[-10] flex items-center justify-center pointer-events-none">
            {brandingSettings && brandingSettings.logoUrl ? (
                <img
                    src={brandingSettings.logoUrl}
                    alt="Watermark"
                    width={500}
                    height={500}
                    crossOrigin="anonymous"
                    className="object-contain opacity-10"
                />
            ) : (
                <TempLogo />
            )}
        </div>
    );
}


export function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <FirebaseContentWrapper>
          <div className="app-root">
            <Watermark />
            {children}
            <AppFooter />
          </div>
          <Toaster />
        </FirebaseContentWrapper>
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
