'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScanSearch, ArrowRight } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-8">
        <ScanSearch className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
          Welcome to DocuExtract
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Effortlessly scan images and documents to extract text and structured data. Turn your physical documents into editable, digital information in seconds.
        </p>
        <Link href="/extractor">
          <Button size="lg" className="text-lg">
            Start Extracting
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
