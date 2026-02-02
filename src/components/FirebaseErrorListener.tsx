
'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(error); // Full error for developer console
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'A database operation was blocked by your security rules. Check the console for details.',
        duration: 10000,
      });
    };

    const unsubscribe = errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null;
}
