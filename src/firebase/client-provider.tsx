'use client';

import { ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<any>(null);

  useEffect(() => {
    try {
      const services = initializeFirebase();
      setValue({ ...services, initializationError: null });
    } catch (e: any) {
      console.error('Firebase init failed:', e);
      setValue({
        app: null,
        auth: null,
        firestore: null,
        storage: null,
        initializationError: e,
      });
    }
  }, []);

  if (!value) return null; // prevent hydration crash

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}