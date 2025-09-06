'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Download, Wand2 } from 'lucide-react';
import { extractBillingDataFromImage, type ExtractBillingDataOutput } from '@/ai/flows/extract-billing-data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from '@/components/ui/skeleton';

function ResultDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="font-code bg-secondary p-3 rounded-md text-foreground whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
  );
}

export function BillingExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [result, setResult] = useState<ExtractBillingDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await extractBillingDataFromImage({ photoDataUri });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract billing data from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFullText = () => {
    if (!result) return '';
    return `Vendor Information: ${result.vendorInformation}\nDates: ${result.dates}\nAmounts: ${result.amounts}\nPurchased Items: ${result.purchasedItems}`;
  };

  const handleDownload = () => {
    const text = getFullText();
    if (!text) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'billing_data.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Upload Bill or Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <FileUploader onFileSelect={setPhotoDataUri} />
          <Button onClick={handleScan} disabled={!photoDataUri || isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Extract Bill Data'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Extracted Bill Data
          </CardTitle>
           {result && (
             <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <ResultDisplay label="Vendor Information" value={result.vendorInformation} />
              <ResultDisplay label="Dates" value={result.dates} />
              <ResultDisplay label="Amounts" value={result.amounts} />
              <ResultDisplay label="Purchased Items" value={result.purchasedItems} />
            </div>
          )}
          {!isLoading && !result && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Your results will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
