
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { signOut } from '@/lib/auth';
import { useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const publicPaths = ['/login', '/seed', '/'];
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

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
  const auth = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout>();

  const handleInactivityLogout = useCallback(async () => {
    if (auth && user) { // Only log out if there's a user
      await signOut(auth);
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity.',
      });
      // The route guarding useEffect will handle the redirect to /login
    }
  }, [auth, user, toast]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(handleInactivityLogout, INACTIVITY_TIMEOUT_MS);
  }, [handleInactivityLogout]);

  // Route guarding effect
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, isAuthLoading, pathname, router]);

  // Inactivity listener effect
  useEffect(() => {
    // Only set up inactivity listeners if a user is logged in
    if (user) {
      const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll'];
      
      const handleActivity = () => {
        resetInactivityTimer();
      };

      events.forEach(event => window.addEventListener(event, handleActivity));
      resetInactivityTimer(); // Start the timer on initial setup

      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }
  }, [user, resetInactivityTimer]);

  if (isAuthLoading) {
    return <FullScreenLoader message="Initializing..." />;
  }
  
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/campaign-public');

  if (!user && !isPublicPath) {
    return <FullScreenLoader message="Redirecting to login..." />;
  }
  
  if (user && pathname === '/login') {
    return <FullScreenLoader message="Redirecting..." />;
  }

  return <>{children}</>;
}
