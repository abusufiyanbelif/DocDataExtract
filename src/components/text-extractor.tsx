
'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Trash2, ScanLine } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

export function TextExtractor() {
  const [photoDataUris, setPhotoDataUris] = useState<string[]>([]);
  const [textResult, setTextResult] = useState<ExtractAndCorrectTextOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const { toast } = useToast();

  const handleScanText = async () => {
    if (photoDataUris.length === 0) {
      toast({ title: 'Error', description: `Please upload an ${uploadType} first.`, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setTextResult(null);
    
    try {
      toast({ title: "Extracting text...", description: "Please wait." });
      const response = await extractAndCorrectText({ photoDataUri: photoDataUris[0] });
      setTextResult(response);
    } catch (error: any) {
      console.warn("Text extraction failed:", error);
      toast({ title: 'Extraction Failed', description: error.message || `Could not extract text from the ${uploadType}.`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPhotoDataUris([]);
    setTextResult(null);
  };
  
  const handleDownloadText = () => {
    if (!textResult?.extractedText) return;
    const element = document.createElement('a');
    const file = new Blob([textResult.extractedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'extracted_text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const acceptedFileTypes = uploadType === 'image' ? 'image/*' : 'application/pdf';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
           <RadioGroup
            defaultValue="image"
            onValueChange={(value: 'image' | 'pdf') => {
              setUploadType(value);
              handleClear();
            }}
            className="grid grid-cols-2 gap-4 w-full mb-4"
            value={uploadType}
          >
            <div>
              <RadioGroupItem value="image" id="image" className="peer sr-only" />
              <Label
                htmlFor="image"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                Image
              </Label>
            </div>
            <div>
              <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
              <Label
                htmlFor="pdf"
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

          <Button onClick={handleScanText} disabled={photoDataUris.length === 0 || isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <ScanLine className="mr-2" />}
            Extract Text
          </Button>

          {photoDataUris.length > 0 && (
              <Button onClick={handleClear} variant="outline" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear
              </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Extracted Text
          </CardTitle>
          {textResult && (
            <Button variant="outline" size="sm" onClick={handleDownloadText}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && (
            <Skeleton className="h-64 w-full" />
          )}
          
          {!isLoading && !textResult && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Your extracted text will appear here.</p>
            </div>
          )}

          {!isLoading && textResult && (
            <Textarea
              value={textResult.extractedText}
              onChange={(e) => setTextResult({ extractedText: e.target.value })}
              rows={12}
              className="font-code bg-secondary"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
