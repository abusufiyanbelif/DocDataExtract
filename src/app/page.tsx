import { DocuExtractHeader } from '@/components/docu-extract-header';
import { HomePageClient } from '@/components/home-page-client';

export default function Home() {
  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <HomePageClient />
      </main>
    </div>
  );
}
