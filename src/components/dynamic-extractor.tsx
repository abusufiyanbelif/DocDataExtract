'use client';

import { useState } from 'react';
import { ToyBrick, Loader2, Wand2 } from 'lucide-react';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { DynamicFields } from './dynamic-fields';

export function DynamicExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [result, setResult] = useState<ExtractDynamicFormOutput | null>(null);
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
      const response = await extractDynamicFormFromImage({ photoDataUri });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract dynamic data from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToyBrick className="w-6 h-6" />
              Upload Document or Form
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <FileUploader onFileSelect={setPhotoDataUri} />
            <Button onClick={handleScan} disabled={!photoDataUri || isLoading} className="w-full">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Extract Dynamic Data'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              Extracted Data Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isLoading && !result && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Your extracted data will appear here.</p>
              </div>
            )}
            {isLoading && (
               <div className="flex items-center justify-center h-64 text-muted-foreground">
                 <Loader2 className="w-8 h-8 animate-spin" />
               </div>
            )}
            {!isLoading && result && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Editable fields will appear below.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <DynamicFields isLoading={isLoading} result={result} setResult={setResult} />
    </div>
  );
}
