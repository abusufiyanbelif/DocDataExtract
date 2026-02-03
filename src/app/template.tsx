
'use client';

import { AuthProvider } from '@/components/auth-provider';
import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
