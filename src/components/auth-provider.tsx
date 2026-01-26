'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';

const publicPaths = ['/login', '/seed'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let unmounted = false;
    
    const updateProgress = (msg: string, val: number) => {
        if (unmounted) return;
        setLoadingMessage(msg);
        setProgress(val);
    }
    
    if (isAuthLoading || !firestore) {
        updateProgress('Connecting to services...', 25);
    } else {
        updateProgress('Checking authentication...', 60);
    }
    
    return () => { unmounted = true; }

  }, [isAuthLoading, firestore])


  useEffect(() => {
    if (isAuthLoading) return;

    setProgress(100);

    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, isAuthLoading, pathname, router]);

  const isLoading = isAuthLoading || progress < 100;
  
  if (isLoading) {
    const isPublic = publicPaths.includes(pathname);
    // This condition shows a loader only when a redirect is imminent.
    if ((!user && !isPublic) || (user && pathname === '/login')) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-xs text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">{loadingMessage}</p>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        );
    }
  }

  return <>{children}</>;
}
