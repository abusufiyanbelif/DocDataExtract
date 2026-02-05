

'use client';
import {
  Users,
  ClipboardList,
  ScanSearch,
  FileText,
  Settings,
  ShieldQuestion,
  Lightbulb,
  Wallet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { hasCampaignPermission, hasLeadPermission } from '@/lib/modules';
import { get } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const dashboardCards = [
  {
    title: 'User Management',
    description: 'Add, edit, and manage user permissions.',
    icon: <Users className="h-8 w-8 text-primary" />,
    href: '/users',
    permissionKey: 'users.read',
  },
  {
    title: 'Campaigns',
    description: 'Track and manage ration distribution campaigns.',
    icon: <ClipboardList className="h-8 w-8 text-primary" />,
    href: '/campaign-members',
    permissionKey: 'campaigns',
  },
   {
    title: 'Donations',
    description: 'Manage all individual donations.',
    icon: <Wallet className="h-8 w-8 text-primary" />,
    href: '/donations',
    permissionKey: 'donations.read',
  },
   {
    title: 'Leads',
    description: 'Manage and track potential new leads or initiatives.',
    icon: <Lightbulb className="h-8 w-8 text-primary" />,
    href: '/leads-members',
    permissionKey: 'leads-members',
  },
  {
    title: 'Extractor',
    description: 'Scan docs to extract text and data.',
    icon: <ScanSearch className="h-8 w-8 text-primary" />,
    href: '/extractor',
    permissionKey: 'extractor.read',
  },
  {
    title: 'Story Creator',
    description: 'Generate narratives from medical or educational documents.',
    icon: <FileText className="h-8 w-8 text-primary" />,
    href: '/story-creator',
    permissionKey: 'storyCreator.read',
  },
   {
    title: 'Settings',
    description: 'Manage global application settings.',
    icon: <Settings className="h-8 w-8 text-primary" />,
    href: '/settings',
    permissionKey: 'settings.read',
  },
  {
    title: 'System Diagnostics',
    description: 'Check the status of system connections.',
    icon: <ShieldQuestion className="h-8 w-8 text-primary" />,
    href: '/diagnostics',
    permissionKey: 'diagnostics.read',
  },
];


export default function Home() {
  const { userProfile, isLoading } = useSession();

  const visibleCards = userProfile ? dashboardCards.filter(card => {
    if (userProfile.role === 'Admin') return true;
    const permissionKey = card.permissionKey;
    if (permissionKey === 'campaigns') {
        return hasCampaignPermission(userProfile, 'create') || hasCampaignPermission(userProfile, 'update') || hasCampaignPermission(userProfile, 'delete') || hasCampaignPermission(userProfile, 'read_any_sub');
    }
    if (permissionKey === 'leads-members') {
         return hasLeadPermission(userProfile, 'create') || hasLeadPermission(userProfile, 'update') || hasLeadPermission(userProfile, 'delete') || hasLeadPermission(userProfile, 'read_any_sub');
    }
    return get(userProfile.permissions, permissionKey, false);
  }) : [];
  
  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                ))}
            </div>
        ) : userProfile ? (
          <>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
                Welcome back, {userProfile.name}!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCards.map((card) => (
                <Link href={card.href} key={card.title} className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary transition-all">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        {card.icon}
                        <div className="flex-1">
                        <CardTitle>{card.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>{card.description}</CardDescription>
                    </CardContent>
                    </Card>
                </Link>
                ))}
            </div>
          </>
        ) : (
           <Card className="max-w-2xl mx-auto text-center mt-10">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Welcome to Baitulmal Samajik Sanstha Solapur</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">
                        Managing and tracking community support campaigns efficiently. View our public campaigns or log in to manage your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link href="/campaign-public">View Public Campaigns</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/leads-public">View Public Leads</Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                        <Link href="/login">Member Login</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
      </main>
    </div>
  );
}

    