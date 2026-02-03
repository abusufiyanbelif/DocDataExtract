
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseContentWrapper } from '@/components/FirebaseContentWrapper';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  return (
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
  );
}
