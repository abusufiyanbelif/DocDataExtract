
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>{children}</AuthProvider>
    </FirebaseClientProvider>
  );
}
