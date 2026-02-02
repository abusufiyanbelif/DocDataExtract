
'use client';
import {
  Users,
  ClipboardList,
  ScanSearch,
  FileText,
  Settings,
  ShieldQuestion,
  Lightbulb,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { get } from '@/lib/utils';

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
    permissionKey: 'campaigns', // Special check
  },
   {
    title: 'Leads',
    description: 'Manage and track potential new leads or initiatives.',
    icon: <Lightbulb className="h-8 w-8 text-primary" />,
    href: '/leads',
    permissionKey: 'leads.read',
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

  const getSubPermission = (perms: any, key: string) => {
    if (!perms) return false;
    if (key === 'campaigns') {
       return perms.create || perms.update || perms.delete || perms.summary?.read || perms.ration?.read || perms.beneficiaries?.read || perms.donations?.read;
    }
    return get(perms, key, false);
  }

  const visibleCards = userProfile ? dashboardCards.filter(card => {
    if (userProfile.role === 'Admin') return true;
    return getSubPermission(userProfile.permissions, card.permissionKey);
  }) : [];
  
  return (
    <div className="min-h-screen text-foreground">
      <DocuExtractHeader />
       <main className="container mx-auto p-4 md:p-8">
        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="h-40 animate-pulse bg-muted"></Card>
                ))}
            </div>
        ) : userProfile ? (
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
        ) : (
           <Card className="max-w-xl mx-auto text-center">
            <CardHeader>
              <CardTitle>Welcome to Your Application Dashboard</CardTitle>
              <CardDescription>
                Please log in to access the management tools and features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">Proceed to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
