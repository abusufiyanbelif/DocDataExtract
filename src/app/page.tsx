
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
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
        </CardContent>
      </Card>
    </main>
  );
}
