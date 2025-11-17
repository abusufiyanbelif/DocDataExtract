import { HeartPulse, BookUser } from 'lucide-react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MedicalExtractor } from '@/components/medical-extractor';
import { EducationExtractor } from '@/components/education-extractor';

export default function StoryCreatorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <Tabs defaultValue="medical" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto bg-primary/10">
            <TabsTrigger value="medical" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HeartPulse className="mr-2 h-5 w-5" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="education" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookUser className="mr-2 h-5 w-5" />
              Education
            </TabsTrigger>
          </TabsList>
          <TabsContent value="medical" className="mt-6">
            <MedicalExtractor enableStoryCreator={true} />
          </TabsContent>
           <TabsContent value="education" className="mt-6">
            <EducationExtractor enableStoryCreator={true} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
