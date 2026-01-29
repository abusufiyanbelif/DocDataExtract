'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export function useCollection<T extends DocumentData>(
  ref: Query | null
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref || !(ref as any).firestore) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(ref, 
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach(doc => {
          result.push({ id: doc.id, ...doc.data() } as unknown as T);
        });
        setData(result);
        setError(null);
        setIsLoading(false);
      }, 
      (err) => {
        if (err.code === 'permission-denied') {
            // Firestore doesn't expose the query path directly, so we access an internal property.
            // This is not ideal but necessary for providing a better debugging experience.
            const path = (ref as any)._query?.path?.segments?.join('/') ?? 'unknown collection';
            const permissionError = new FirestorePermissionError({
                path: path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error(err);
        }
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, isLoading, error };
}
