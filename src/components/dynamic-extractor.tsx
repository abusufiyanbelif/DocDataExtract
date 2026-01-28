'use client';

import { useState } from 'react';
import { ToyBrick, Loader2, Wand2, Trash2 } from 'lucide-react';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { DynamicFields } from './dynamic-fields';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

export function DynamicExtractor() {
  const [photoDataUris, setPhotoDataUris] = useState<string[]>([]);
  const [result, setResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const { toast } = useToast();

  const handleScan = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri: photoDataUris[0] });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: `Could not extract dynamic data from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPhotoDataUris([]);
    setResult(null);
  };
  
  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToyBrick className="w-6 h-6" />
              Upload Document or Form
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <RadioGroup
              defaultValue="image"
              onValueChange={(value: 'image' | 'pdf') => {
                setUploadType(value);
                handleClear();
              }}
              className="grid grid-cols-2 gap-4 w-full"
              value={uploadType}
            >
              <div>
                <RadioGroupItem value="image" id="image-dynamic" className="peer sr-only" />
                <Label
                  htmlFor="image-dynamic"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Image
                </Label>
              </div>
              <div>
                <RadioGroupItem value="pdf" id="pdf-dynamic" className="peer sr-only" />
                <Label
                  htmlFor="pdf-dynamic"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  PDF
                </Label>
              </div>
            </RadioGroup>

            <FileUploader 
                onFileSelect={setPhotoDataUris} 
                acceptedFileTypes={acceptedFileTypes}
                key={uploadType}
            />

            <Button onClick={handleScan} disabled={photoDataUris.length === 0 || isLoading} className="w-full">
              {isLoading ? <Loader2 className="animate-spin" /> : `Extract Dynamic Data from ${uploadType === 'image' ? 'Image' : 'PDF'}`}
            </Button>
            {photoDataUris.length > 0 && (
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
            )}
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
