
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Settings, Briefcase, Bot, Database, TestTube2, MessageSquareQuote } from 'lucide-react';
import { useSession } from '@/hooks/use-session';

function FeatureCard({ icon, title, description, href, permissionCheck }: { icon: React.ReactNode, title: string, description: string, href: string, permissionCheck: boolean }) {
  if (!permissionCheck) {
    return null;
  }
  return (
    <Link href={href} className="block hover:shadow-lg transition-shadow rounded-lg">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center gap-4">
          {icon}
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function Home() {
  const { userProfile } = useSession();
  const permissions = userProfile?.permissions;

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <DocuExtractHeader />
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">Welcome, {userProfile?.name || "Guest"}!</h1>
            <p className="text-lg text-muted-foreground">What would you like to do today?</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Users className="w-8 h-8 text-primary" />}
              title="User Management"
              description="Add, edit, and manage user accounts and permissions."
              href="/users"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.users?.read)}
            />
             <FeatureCard
              icon={<Briefcase className="w-8 h-8 text-primary" />}
              title="Campaigns"
              description="Manage and track campaigns."
              href="/campaign-members"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.campaigns)}
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8 text-primary" />}
              title="Extractor"
              description="Scan and extract data from various types of documents."
              href="/extractor"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.extractor?.read)}
            />
            <FeatureCard
              icon={<MessageSquareQuote className="w-8 h-8 text-primary" />}
              title="Story Creator"
              description="Generate narrative summaries from medical or academic documents."
              href="/story-creator"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.storyCreator?.read)}
            />
             <FeatureCard
              icon={<Bot className="w-8 h-8 text-primary" />}
              title="Leads"
              description="Track and manage potential new leads or initiatives."
              href="/leads"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.leads?.read)}
            />
             <FeatureCard
              icon={<Settings className="w-8 h-8 text-primary" />}
              title="Settings"
              description="Configure application-wide settings like branding."
              href="/settings"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.settings?.read)}
            />
             <FeatureCard
              icon={<TestTube2 className="w-8 h-8 text-primary" />}
              title="Diagnostics"
              description="Check system health and connectivity to external services."
              href="/diagnostics"
              permissionCheck={!!userProfile && (userProfile.role === 'Admin' || !!permissions?.diagnostics?.read)}
            />
             <FeatureCard
              icon={<Database className="w-8 h-8 text-primary" />}
              title="Database Management"
              description="Instructions for seeding and managing database via CLI."
              href="/seed"
              permissionCheck={!!userProfile && userProfile.role === 'Admin'}
            />
          </div>

          {!userProfile && (
            <div className="text-center mt-12">
               <p className="text-lg text-muted-foreground mb-4">You are not logged in. Some features may be unavailable.</p>
               <div className="flex gap-4 justify-center">
                  <Button asChild><Link href="/login">Go to Login Page</Link></Button>
                  <Button asChild variant="outline"><Link href="/campaign-public">View Public Campaigns</Link></Button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
