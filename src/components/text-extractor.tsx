'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Wand2, Trash2 } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { DynamicFields } from './dynamic-fields';

export function TextExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [textResult, setTextResult] = useState<ExtractAndCorrectTextOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  const handleScanText = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingText(true);
    setTextResult(null);

    try {
      const response = await extractAndCorrectText({ photoDataUri });
      setTextResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract text from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleGetFields = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoadingFields(true);
    setFieldsResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleClear = () => {
    setPhotoDataUri('');
    setTextResult(null);
    setFieldsResult(null);
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
  
  const isLoading = isLoadingText || isLoadingFields;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <FileUploader onFileSelect={setPhotoDataUri} />
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleScanText} disabled={!photoDataUri || isLoading} className="w-full">
                {isLoadingText ? <Loader2 className="animate-spin" /> : 'Extract Text'}
              </Button>
              <Button onClick={handleGetFields} disabled={!photoDataUri || isLoading} className="w-full">
                {isLoadingFields ? <Loader2 className="animate-spin" /> : 'Get Fields'}
              </Button>
            </div>
            {photoDataUri && (
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              Extracted Text
            </CardTitle>
            {textResult && (
              <Button variant="outline" size="sm" onClick={handleDownloadText}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingText && (
              <Skeleton className="h-64 w-full" />
            )}
            
            {!isLoadingText && !textResult && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Your extracted text will appear here.</p>
              </div>
            )}

            {!isLoadingText && textResult && (
              <Textarea
                value={textResult.extractedText}
                readOnly
                rows={12}
                className="font-code bg-secondary"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DynamicFields 
        isLoading={isLoadingFields} 
        result={fieldsResult} 
        setResult={setFieldsResult} 
      />
    </div>
  );
}
