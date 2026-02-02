'use client';

import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Users,
  LayoutGrid,
  ScanSearch,
  FileText,
  ShieldQuestion,
  Settings,
  LogIn,
  Lightbulb,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { get } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function DashboardCard({ title, description, href, icon }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="bg-primary/10 p-3 rounded-lg text-primary">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{description}</CardDescription>
        <Button asChild className="w-full">
          <Link href={href}>Go to {title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { user, userProfile, isLoading } = useSession();

  const canRead = (module: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'Admin') return true;
    const path = module + '.read';
    return !!get(userProfile, `permissions.${path}`, false);
  };
  
  const canReadAnyCampaignSubmodule = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'Admin') return true;
    const perms = userProfile.permissions?.campaigns;
    return !!(perms?.summary?.read || perms?.ration?.read || perms?.beneficiaries?.read || perms?.donations?.read);
  }
  
  const canReadAnyLeadSubmodule = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'Admin') return true;
    const perms = userProfile.permissions?.leads;
    return !!perms?.read;
  }

  if (isLoading && (!user || !userProfile)) {
    return (
      <>
        <DocuExtractHeader />
        <main className="container mx-auto p-4 md:p-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        {!user || !userProfile ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
              Welcome to Baitulmal Samajik Sanstha Solapur
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              A platform for managing and tracking community support campaigns efficiently.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-5 w-5" />
                  Member Login
                </Link>
              </Button>
               <Button size="lg" variant="outline" asChild>
                <Link href="/campaign-public">
                  View Public Campaigns
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Welcome, {userProfile.name}!</h1>
                <p className="text-muted-foreground">What would you like to do today?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(userProfile.role === 'Admin' || canReadAnyCampaignSubmodule()) && (
                <DashboardCard
                  title="Campaigns"
                  description="Manage campaigns, beneficiaries, and donations."
                  href="/campaign-members"
                  icon={<LayoutGrid />}
                />
              )}
               {(userProfile.role === 'Admin' || canReadAnyLeadSubmodule()) && (
                <DashboardCard
                  title="Leads"
                  description="Manage and track leads for new campaigns."
                  href="/leads"
                  icon={<Lightbulb />}
                />
              )}
              {(userProfile.role === 'Admin' || canRead('users')) && (
                <DashboardCard
                  title="Users"
                  description="Manage user accounts and permissions."
                  href="/users"
                  icon={<Users />}
                />
              )}
              {(userProfile.role === 'Admin' || canRead('extractor')) && (
                <DashboardCard
                  title="Extractor"
                  description="Scan and extract data from documents."
                  href="/extractor"
                  icon={<ScanSearch />}
                />
              )}
              {(userProfile.role === 'Admin' || canRead('storyCreator')) && (
                <DashboardCard
                  title="Story Creator"
                  description="Generate narratives from reports."
                  href="/story-creator"
                  icon={<FileText />}
                />
              )}
              {(userProfile.role === 'Admin' || canRead('settings')) && (
                 <DashboardCard
                  title="Settings"
                  description="Configure application branding and payments."
                  href="/settings"
                  icon={<Settings />}
                />
              )}
              {(userProfile.role === 'Admin' || canRead('diagnostics')) && (
                <DashboardCard
                  title="Diagnostics"
                  description="Check system health and connectivity."
                  href="/diagnostics"
                  icon={<ShieldQuestion />}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
