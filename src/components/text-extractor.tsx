'use client';

import { useState } from 'react';
import { FileText, Loader2, Download, Wand2, ToyBrick, Trash2 } from 'lucide-react';
import { extractAndCorrectText, type ExtractAndCorrectTextOutput } from '@/ai/flows/extract-and-correct-text';
import { extractDynamicFormFromImage, type ExtractDynamicFormOutput } from '@/ai/flows/extract-dynamic-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './file-uploader';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';

type ExtractionMode = 'text' | 'fields';

export function TextExtractor() {
  const [photoDataUri, setPhotoDataUri] = useState<string>('');
  const [textResult, setTextResult] = useState<ExtractAndCorrectTextOutput | null>(null);
  const [fieldsResult, setFieldsResult] = useState<ExtractDynamicFormOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ExtractionMode>('text');
  const { toast } = useToast();

  const handleScanText = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setMode('text');
    setTextResult(null);
    setFieldsResult(null);

    try {
      const response = await extractAndCorrectText({ photoDataUri });
      setTextResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract text from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetFields = async () => {
    if (!photoDataUri) {
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setMode('fields');
    setTextResult(null);
    setFieldsResult(null);

    try {
      const response = await extractDynamicFormFromImage({ photoDataUri });
      setFieldsResult(response);
    } catch (error) {
      console.error(error);
      toast({ title: 'Extraction Failed', description: 'Could not extract fields from the image.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    if (!fieldsResult) return;
    const newFields = [...fieldsResult.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFieldsResult({ fields: newFields });
  };
  
  const handleRemoveField = (index: number) => {
    if (!fieldsResult) return;
    const newFields = fieldsResult.fields.filter((_, i) => i !== index);
    setFieldsResult({ fields: newFields });
  };

  const handleDownload = () => {
    let content: string | undefined;
    let fileName: string;
    let mimeType = 'text/plain';

    if (mode === 'text' && textResult?.extractedText) {
      content = textResult.extractedText;
      fileName = 'extracted_text.txt';
    } else if (mode === 'fields' && fieldsResult?.fields) {
      const jsonObject = fieldsResult.fields.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      content = JSON.stringify(jsonObject, null, 2);
      mimeType = 'application/json';
      fileName = 'extracted_fields.json';
    }

    if (!content) return;

    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const hasResult = (textResult && mode === 'text') || (fieldsResult && mode === 'fields');

  return (
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
              {isLoading && mode === 'text' ? <Loader2 className="animate-spin" /> : 'Extract Text'}
            </Button>
            <Button onClick={handleGetFields} disabled={!photoDataUri || isLoading} className="w-full">
              {isLoading && mode === 'fields' ? <Loader2 className="animate-spin" /> : 'Get Fields'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Extracted Text
          </CardTitle>
          {hasResult && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
             <div className="space-y-4">
               {mode === 'text' ? (
                <Skeleton className="h-64 w-full" />
               ) : (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-2/3" />
                  </div>
                ))
               )}
            </div>
          )}
          
          {!isLoading && !hasResult && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Your results will appear here.</p>
            </div>
          )}

          {!isLoading && hasResult && mode === 'text' && textResult && (
            <Textarea
              value={textResult.extractedText}
              readOnly
              rows={12}
              className="font-code bg-secondary"
            />
          )}

          {!isLoading && hasResult && mode === 'fields' && fieldsResult && (
             <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-2">
              {fieldsResult.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <Input
                    value={field.key}
                    onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="font-code"
                  />
                  <Input
                    value={field.value}
                    onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="font-code"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}