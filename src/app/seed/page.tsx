'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Database, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {

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
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Application Seeding via Command Line</CardTitle>
            <CardDescription>
                The database seeding process has been moved to a more reliable command-line script.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Action Required: Run the Seed Script</AlertTitle>
                <AlertDescription>
                    To set up your application for the first time or to repair the admin account, you need to run the seed script from your terminal.
                </AlertDescription>
            </Alert>

            <div className="space-y-4">
                <h3 className="font-semibold">One-Time Setup</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Go to your Firebase Project Settings > Service accounts.</li>
                    <li>Click **Generate new private key** to download your service account JSON file.</li>
                    <li>Rename the downloaded file to `serviceAccountKey.json` and place it in the root of your project.</li>
                    <li>Create a file named `.env` in the root of your project.</li>
                    <li>Add the line `GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"` to your `.env` file.</li>
                </ol>
            </div>
            
            <div className="space-y-2">
                <h3 className="font-semibold">Run the Script</h3>
                 <p className="text-sm text-muted-foreground">Open a terminal in the project root and run the following command:</p>
                <div className="p-4 bg-muted rounded-md font-mono text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4"/>
                    <span>npm run db:seed</span>
                </div>
            </div>
            
            <p className="text-sm text-muted-foreground pt-4">
                This script will securely create the initial administrator account and all necessary database records. After it completes, you can log in with the default credentials.
            </p>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
