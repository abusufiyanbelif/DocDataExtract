'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCollection } from '@/firebase';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignPage() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCollection<Campaign>('campaigns');

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaign/${campaignId}`);
  };

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
            <CardTitle>Campaigns</CardTitle>
            <Button asChild>
              <Link href="/campaign/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70%]">Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    <TableRow>
                      <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                    </TableRow>
                     <TableRow>
                      <TableCell><Skeleton className="h-6 w-2/3" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                    </TableRow>
                  </>
                )}
                {!isLoading && campaigns.map((campaign) => (
                  <TableRow key={campaign.id} onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.status}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && campaigns.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No campaigns found. <Link href="/campaign/create" className="text-primary underline">Create one now</Link>.
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
