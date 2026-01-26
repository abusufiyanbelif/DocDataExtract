'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const campaigns = [
  {
    id: 'ration-kit-distribution-ramza-2026',
    name: 'Ration Kit Distribution Ramza 2026',
    status: 'Upcoming',
  },
];

export default function CampaignPage() {
  const router = useRouter();

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaign/${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
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
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
