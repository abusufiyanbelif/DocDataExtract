
'use client';

import { useEffect } from 'react';
import { LogOut, User, LogIn, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { useBranding } from '@/hooks/use-branding';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export function DocuExtractHeader() {
  const session = useSession();
  const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const isLoading = session.isLoading || isBrandingLoading;
  const user = session.user;
  const userProfile = session.userProfile;
  
  const validLogoUrl = brandingSettings?.logoUrl?.trim() ? brandingSettings.logoUrl : null;
  const logoStyle: React.CSSProperties = {
    objectFit: 'contain',
    maxHeight: '3rem', // 48px
  };

  if (brandingSettings?.logoWidth) {
    logoStyle.width = `${brandingSettings.logoWidth}px`;
  } else {
    logoStyle.width = 'auto';
  }
  if (brandingSettings?.logoHeight) {
    logoStyle.height = `${brandingSettings.logoHeight}px`;
  } else {
    logoStyle.height = 'auto';
  }


  return (
    <header className="bg-card border-b p-2 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 w-fit group transition-transform duration-300 ease-in-out hover:scale-105">
          <div className="relative flex items-center justify-center" style={{ minHeight: '3rem' }}>
            {isLoading ? (
                <Skeleton className="h-12 w-24" />
            ) : (
                validLogoUrl && (
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(validLogoUrl)}`}
                    alt="Company Logo"
                    style={logoStyle}
                  />
                )
            )}
            </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-headline text-foreground hidden sm:block">
            Baitulmal Samajik Sanstha Solapur
          </h1>
        </Link>

        {isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
        ) : user && userProfile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full transition-transform duration-300 ease-in-out hover:scale-110">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user.photoURL || ''}
                    alt={userProfile?.name || 'User'}
                  />
                  <AvatarFallback>
                    {getInitials(userProfile?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userProfile?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              {userProfile.role === 'Admin' && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
