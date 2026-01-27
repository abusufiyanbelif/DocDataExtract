'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScanSearch, ArrowRight, FileText, ShoppingBasket, Users, ShieldCheck } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { DocuExtractHeader } from '@/components/docu-extract-header';

export default function LandingPage() {
  const { userProfile, isLoading } = useUserProfile();

  const campaignPerms = userProfile?.permissions?.campaigns;
  const canReadAnyCampaignSubmodule = 
    !!campaignPerms?.summary?.read ||
    !!campaignPerms?.ration?.read ||
    !!campaignPerms?.beneficiaries?.read ||
    !!campaignPerms?.donations?.read;

  const canViewCampaigns = userProfile?.role === 'Admin' || !!campaignPerms?.read || canReadAnyCampaignSubmodule;
  const canViewUsers = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.read;
  const canViewExtractor = userProfile?.role === 'Admin' || !!userProfile?.permissions?.extractor?.read;
  const canViewStoryCreator = userProfile?.role === 'Admin' || !!userProfile?.permissions?.storyCreator?.read;
  const canViewDiagnostics = userProfile?.role === 'Admin' || !!userProfile?.permissions?.diagnostics?.read;


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="flex flex-grow flex-col items-center justify-center">
        <div className="container mx-auto flex flex-col items-center justify-center text-center p-8">
            <ScanSearch className="h-24 w-24 text-primary mb-6" />
            <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
            Welcome to DocDataExtract AB
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Effortlessly scan images and documents to extract text, or synthesize multiple documents into a single story.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
            {isLoading && (
                <>
                <Skeleton className="h-11 w-48" />
                <Skeleton className="h-11 w-48" />
                <Skeleton className="h-11 w-48" />
                <Skeleton className="h-11 w-36" />
                </>
            )}
            {!isLoading && (
              <>
                {canViewExtractor && (
                    <Link href="/extractor">
                        <Button size="lg" className="text-lg">
                        Start Extracting
                        <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                )}
                {canViewStoryCreator && (
                    <Link href="/story-creator">
                        <Button size="lg" variant="outline" className="text-lg">
                        <FileText className="mr-2 h-5 w-5" />
                        Create a Story
                        </Button>
                    </Link>
                )}
                {canViewCampaigns && (
                  <Link href="/campaign">
                      <Button size="lg" variant="outline" className="text-lg">
                      <ShoppingBasket className="mr-2 h-5 w-5" />
                      Campaigns
                      </Button>
                  </Link>
                )}
                {canViewUsers && (
                  <Link href="/users">
                      <Button size="lg" variant="outline" className="text-lg">
                      <Users className="mr-2 h-5 w-5" />
                      Users
                      </Button>
                  </Link>
                )}
                {canViewDiagnostics && (
                     <Link href="/diagnostics">
                        <Button size="lg" variant="outline" className="text-lg">
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Diagnostics
                        </Button>
                    </Link>
                )}
              </>
            )}
            </div>
        </div>
      </main>
    </div>
  );
}
