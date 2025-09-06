import { CreditCard, FileText, HeartPulse, User, ScanSearch } from 'lucide-react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextExtractor } from '@/components/text-extractor';
import { IdentityExtractor } from '@/components/identity-extractor';
import { BillingExtractor } from '@/components/billing-extractor';
import { MedicalExtractor } from '@/components/medical-extractor';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto bg-primary/10">
            <TabsTrigger value="text" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="mr-2 h-5 w-5" />
              General Text
            </TabsTrigger>
            <TabsTrigger value="identity" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="mr-2 h-5 w-5" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="billing" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="mr-2 h-5 w-5" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="medical" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HeartPulse className="mr-2 h-5 w-5" />
              Medical
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="mt-6">
            <TextExtractor />
          </TabsContent>
          <TabsContent value="identity" className="mt-6">
            <IdentityExtractor />
          </TabsContent>
          <TabsContent value="billing" className="mt-6">
            <BillingExtractor />
          </TabsContent>
          <TabsContent value="medical" className="mt-6">
            <MedicalExtractor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
