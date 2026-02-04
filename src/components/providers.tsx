
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/app/auth-provider';
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
    
    const validLogoUrl = brandingSettings?.logoUrl?.trim() ? brandingSettings.logoUrl : null;

    return (
        <div className="fixed inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-5">
            {validLogoUrl ? (
                <img
                    src={`/api/image-proxy?url=${encodeURIComponent(validLogoUrl)}`}
                    alt="Watermark"
                    width={500}
                    height={500}
                    className="object-contain"
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
          <div className="app-root relative">
            <Watermark />
            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex-grow">
                    {children}
                </div>
                <AppFooter />
            </div>
          </div>
          <Toaster />
        </FirebaseContentWrapper>
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
