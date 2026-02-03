'use client';

import { AuthProvider } from '@/components/auth-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppFooter } from '@/components/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseContentWrapper } from '@/components/FirebaseContentWrapper';
import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
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
