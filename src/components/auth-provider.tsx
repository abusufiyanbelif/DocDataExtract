
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login', '/seed', '/'];

function RedirectLoader({ message }: { message: string }) {
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
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Don't do anything while auth is loading
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isLoading, pathname, router]);
  
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');
  const needsRedirect = !isLoading && ((!user && !isPublicPath) || (user && pathname === '/login'));

  return (
    <>
        {needsRedirect && <RedirectLoader message="Redirecting..." />}
        {children}
    </>
  );
}
