
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login', '/seed', '/'];

function FullScreenLoader({ message }: { message: string }) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-xs text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) {
      return; // Don't do anything while auth is loading
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isAuthLoading, pathname, router]);

  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const needsRedirect = (!user && !isPublicPath) || (user && pathname === '/login');
  
  // Render children always to prevent 404, but show an overlay loader if auth state 
  // is resolving or a redirect is pending.
  return (
    <>
        {(isAuthLoading || needsRedirect) && <FullScreenLoader message={isAuthLoading ? "Initializing..." : "Redirecting..."} />}
        {children}
    </>
  );
}
