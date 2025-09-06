'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Wand2 } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';

export function TextExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [result, setResult] = useState<ExtractAndCorrectTextOutput | null>(null);
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
      const response = await extractAndCorrectText({ photoDataUri });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract text from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.extractedText) return;
    const element = document.createElement('a');
    const file = new Blob([result.extractedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'extracted_text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <FileUploader onFileSelect={setPhotoDataUri} />
          <Button onClick={handleScan} disabled={!photoDataUri || isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Extract Text'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Extracted Text
          </CardTitle>
          {result && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <Skeleton className="h-64 w-full" />}
          {result && (
            <Textarea
              value={result.extractedText}
              readOnly
              rows={12}
              className="font-code bg-secondary"
            />
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
