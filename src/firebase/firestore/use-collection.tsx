'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';

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
          result.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(result);
        setError(null);
        setIsLoading(false);
      }, 
      (err) => {
        console.error(err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, isLoading, error };
}
