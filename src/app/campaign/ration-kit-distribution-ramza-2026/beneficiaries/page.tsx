import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function BeneficiariesPage() {
  const campaignId = 'ration-kit-distribution-ramza-2026';
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Ration Kit Distribution Ramza 2026</h1>
        </div>
        
        <div className="flex gap-2 border-b mb-4">
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
            </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Beneficiary List 2026</CardTitle>
          </CardHeader>
          <CardContent>
            <p>A list of beneficiaries for this campaign will be displayed here.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
