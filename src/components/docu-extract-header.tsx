import { ScanSearch } from 'lucide-react';

export function DocuExtractHeader() {
  return (
    <header className="bg-card border-b p-4 shadow-sm">
      <div className="container mx-auto flex items-center gap-3">
        <ScanSearch className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline text-foreground">
          DocuExtract
        </h1>
      </div>
    </header>
  );
}
