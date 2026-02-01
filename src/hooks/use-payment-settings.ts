
'use client';
import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { PaymentSettings } from '@/lib/types';

export function usePaymentSettings() {
  const firestore = useFirestore();

  const paymentSettingsDocRef = useMemo(() => {
    if (!firestore) {
      return null;
    }
    return doc(firestore, 'settings', 'payment') as DocumentReference<PaymentSettings>;
  }, [firestore]);

  const { data: paymentSettings, isLoading, error } = useDoc<PaymentSettings>(paymentSettingsDocRef);

  return { 
    paymentSettings, 
    isLoading, 
    error,
  };
}
