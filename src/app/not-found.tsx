
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScanSearch, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-8">
        <ScanSearch className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
          404 - Page Not Found
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Oops! The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button size="lg" className="text-lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
