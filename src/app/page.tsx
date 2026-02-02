
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DocuExtractHeader } from '@/components/docu-extract-header';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <DocuExtractHeader />
      <main className="flex flex-grow flex-col items-center justify-center text-center p-8">
        <h1 className="text-4xl font-bold mb-4">Hello! The Server is Running.</h1>
        <p className="text-lg text-muted-foreground mb-6">If you can see this message, the basic routing and server configuration are now correct.</p>
        <div className="flex gap-4">
            <Link href="/login">
                <Button>Go to Login Page</Button>
            </Link>
             <Link href="/campaign-public">
                  <Button variant="outline">View Public Campaigns</Button>
            </Link>
        </div>
      </main>
    </div>
  );
}
