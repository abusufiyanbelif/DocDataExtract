'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { collection } from 'firebase/firestore';

export default function CampaignPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const campaignsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'campaigns');
  }, [firestore]);

  const { data: campaigns, isLoading: areCampaignsLoading } = useCollection<Campaign>(campaignsCollectionRef);
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaign/${campaignId}`);
  };

  const isLoading = areCampaignsLoading || isProfileLoading;
  const isAdmin = userProfile?.role === 'Admin';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ration Campaigns</CardTitle>
            {isLoading && <Skeleton className="h-10 w-44" />}
            {!isLoading && isAdmin && (
              <Button asChild>
                <Link href="/campaign/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Campaign Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    <TableRow>
                      <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                    </TableRow>
                     <TableRow>
                      <TableCell><Skeleton className="h-6 w-2/3" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                    </TableRow>
                  </>
                )}
                {!isLoading && campaigns.map((campaign) => (
                  <TableRow key={campaign.id} onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.startDate}</TableCell>
                    <TableCell>{campaign.endDate}</TableCell>
                    <TableCell>{campaign.status}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && campaigns.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No campaigns found. {isAdmin && <Link href="/campaign/create" className="text-primary underline">Create one now</Link>}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
