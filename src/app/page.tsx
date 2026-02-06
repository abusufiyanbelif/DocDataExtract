
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';


export default function Home() {
  const { userProfile, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && userProfile) {
      router.replace('/dashboard');
    }
  }, [isLoading, userProfile, router]);

  if (isLoading || userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
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
    </main>
  );
}
