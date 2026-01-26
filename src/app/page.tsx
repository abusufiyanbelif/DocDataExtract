'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScanSearch, ArrowRight, FileText, ShoppingBasket, Users, ShieldCheck } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingPage() {
  const { userProfile, isLoading } = useUserProfile();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-8">
        <ScanSearch className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
          Welcome to DocDataExtract AB
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Effortlessly scan images and documents to extract text, or synthesize multiple documents into a single story.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/extractor">
            <Button size="lg" className="text-lg">
              Start Extracting
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/story-creator">
            <Button size="lg" variant="outline" className="text-lg">
              <FileText className="mr-2 h-5 w-5" />
              Create a Story
            </Button>
          </Link>
          {isLoading && (
            <>
              <Skeleton className="h-11 w-48" />
              <Skeleton className="h-11 w-28" />
            </>
          )}
          {!isLoading && userProfile?.role === 'Admin' && (
            <>
              <Link href="/campaign">
                <Button size="lg" variant="outline" className="text-lg">
                  <ShoppingBasket className="mr-2 h-5 w-5" />
                  Ration Campaigns
                </Button>
              </Link>
              <Link href="/users">
                <Button size="lg" variant="outline" className="text-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Users
                </Button>
              </Link>
            </>
          )}
           <Link href="/diagnostics">
            <Button size="lg" variant="outline" className="text-lg">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Diagnostics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
