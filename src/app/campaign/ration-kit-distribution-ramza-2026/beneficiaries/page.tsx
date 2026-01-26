'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Info } from 'lucide-react';
import { DocuExtractHeader } from '@/components/docu-extract-header';

export default function DeprecatedCampaignPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Info className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Page No Longer In Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This page was a static example. The application now uses a dynamic, database-driven system for campaigns.
            </p>
            <p>
              Please access all campaigns, including this one, through the main campaign list to use live data from the database.
            </p>
            <Button asChild>
              <Link href="/campaign">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Campaign List
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
