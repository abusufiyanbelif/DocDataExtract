'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function HomePageClient() {
  const { isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex justify-center mt-10">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  return (
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
  );
}
