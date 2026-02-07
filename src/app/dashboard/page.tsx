
'use client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Users, FolderKanban, ScanSearch, Settings, MessageSquare, Lightbulb, Database, FlaskConical, LifeBuoy } from 'lucide-react';
import { get } from '@/lib/utils';
import React from 'react';

function DashboardCard({ title, description, href, icon: Icon, isVisible, animationDelay }: { title: string, description: string, href: string, icon: React.ComponentType<{ className?: string }>, isVisible: boolean, animationDelay: string }) {
  if (!isVisible) {
    return null;
  }
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 animate-fade-in-zoom" 
      style={{ animationDelay }}
    >
      <Link href={href} className="block h-full p-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </div>
            <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const { userProfile } = useSession();
  
  const canViewCampaigns = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.campaigns', false);
  const canViewLeads = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.leads-members', false);
  const canViewDonations = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.donations', false);
  const canViewExtractor = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.extractor', false);
  const canViewStoryCreator = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.storyCreator', false);
  const canViewUsers = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.users', false);
  const canViewSettings = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.settings', false);
  const canViewDiagnostics = userProfile?.role === 'Admin' || !!get(userProfile, 'permissions.diagnostics', false);

  const cards = [
    { title: "Campaigns", description: "Manage ration, relief, and general campaigns.", href: "/campaign-members", icon: FolderKanban, isVisible: canViewCampaigns },
    { title: "Leads", description: "Track and convert new initiatives and opportunities.", href: "/leads-members", icon: Lightbulb, isVisible: canViewLeads },
    { title: "Donations", description: "View and manage all incoming donations.", href: "/donations", icon: LifeBuoy, isVisible: canViewDonations },
    { title: "Extractor", description: "Scan & extract data from various documents.", href: "/extractor", icon: ScanSearch, isVisible: canViewExtractor },
    { title: "Story Creator", description: "Generate narratives from documents.", href: "/story-creator", icon: MessageSquare, isVisible: canViewStoryCreator },
    { title: "User Management", description: "Manage user accounts and permissions.", href: "/users", icon: Users, isVisible: canViewUsers },
    { title: "Settings", description: "Configure application branding and payments.", href: "/settings", icon: Settings, isVisible: canViewSettings },
    { title: "Diagnostics", description: "Check system health and configurations.", href: "/diagnostics", icon: FlaskConical, isVisible: canViewDiagnostics },
  ];

  const visibleCards = cards.filter(card => card.isVisible);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold animate-fade-in-zoom" style={{ animationDelay: '300ms' }}>Dashboard</h1>
        <p className="text-muted-foreground animate-fade-in-zoom" style={{ animationDelay: '400ms' }}>Welcome back, {userProfile?.name}. Here's an overview of your application modules.</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleCards.map((card, index) => (
              <DashboardCard
                key={card.title}
                {...card}
                animationDelay={`${500 + index * 100}ms`}
              />
            ))}
        </div>
      </div>
    </main>
  );
}
