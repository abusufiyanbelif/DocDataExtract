import { DocuExtractHeader } from '@/components/docu-extract-header';
import { StoryCreator } from '@/components/story-creator';

export default function StoryCreatorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <StoryCreator />
      </main>
    </div>
  );
}
