'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login', '/seed', '/', '/public'];

function FullScreenLoader({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
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
    
    const isPublicPath = publicPaths.includes(pathname) || 
                         pathname.startsWith('/public') || 
                         /^\/campaign\/[^/]+\/summary$/.test(pathname);


    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isAuthLoading, pathname, router]);

  if (isAuthLoading) {
    return <FullScreenLoader message="Initializing..." />;
  }
  
  const isPublicPath = publicPaths.includes(pathname) || 
                       pathname.startsWith('/public') || 
                       /^\/campaign\/[^/]+\/summary$/.test(pathname);


  // If a redirect is needed, show a loader while the useEffect triggers the navigation
  if (!user && !isPublicPath) {
    return <FullScreenLoader message="Redirecting to login..." />;
  }
  
  if (user && pathname === '/login') {
    return <FullScreenLoader message="Redirecting..." />;
  }

  return <>{children}</>;
}
