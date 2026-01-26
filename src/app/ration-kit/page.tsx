import { ShoppingBasket, ArrowRight, ArrowLeft } from 'lucide-react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RationKitPage() {
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
        <div className="flex flex-col items-center justify-center text-center">
            <ShoppingBasket className="h-24 w-24 text-primary mb-6" />
            <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
            Ration Kit Management
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            This is the central hub for managing ration kits. From here you can view, distribute, and track ration kits.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="text-lg" disabled>
                Distribute Kit
                <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
